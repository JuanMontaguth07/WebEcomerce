"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { translateDbError } from "@/features/admin/shared";
import { revalidateCatalog } from "@/features/catalog/revalidate";
import { adminAction } from "@/lib/admin-action";
import { AppError } from "@/lib/errors";
import { CATALOG_BUCKET } from "@/lib/images";
import { FLAGS_TAG } from "./queries";
import { flagSchema } from "./schemas";

type AdminSupabase = Parameters<Parameters<typeof adminAction>[1]>[1]["supabase"];

/** Las banderas salen en las tarjetas de toda la tienda: se invalida también el catálogo. */
function revalidateFlags() {
  updateTag(FLAGS_TAG);
  revalidateCatalog();
}

async function removeLogo(supabase: AdminSupabase, path: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from(CATALOG_BUCKET).remove([path]);
  if (error) console.error("[storage] logo sin borrar", { path, error: error.message });
}

export const saveFlag = adminAction(flagSchema, async (values, { supabase }) => {
  const row = {
    name: values.name,
    color: values.color,
    logo_path: values.logoPath,
    show_name: values.showName,
    is_active: values.isActive,
  };
  const unique = {
    uniqueFields: {
      product_flags_name_key: { field: "name", message: "Ya existe una etiqueta con este nombre." },
    },
  };

  if (!values.id) {
    const { data, error } = await supabase.from("product_flags").insert(row).select("id").single();
    if (error) translateDbError(error, unique);
    revalidateFlags();
    return { id: data.id };
  }

  const { data: previous } = await supabase
    .from("product_flags")
    .select("logo_path")
    .eq("id", values.id)
    .maybeSingle();
  if (!previous) throw new AppError("NOT_FOUND");

  const { error } = await supabase.from("product_flags").update(row).eq("id", values.id);
  if (error) translateDbError(error, unique);
  // El logo reemplazado o quitado ya no lo usa nadie.
  if (previous.logo_path !== values.logoPath) await removeLogo(supabase, previous.logo_path);
  revalidateFlags();
  return { id: values.id };
});

export const deleteFlag = adminAction(z.object({ id: z.uuid() }), async ({ id }, { supabase }) => {
  // Los productos que la usaban quedan sin bandera (ON DELETE SET NULL).
  const { data, error } = await supabase
    .from("product_flags")
    .delete()
    .eq("id", id)
    .select("logo_path")
    .single();
  if (error) throw error;
  await removeLogo(supabase, data.logo_path);
  revalidateFlags();
  return { id };
});

/** Asigna (o quita, con null) la bandera de varios productos a la vez. */
export const setProductsFlag = adminAction(
  z.object({
    ids: z.array(z.uuid()).min(1, "Selecciona al menos un producto.").max(100),
    flagId: z.uuid().nullable(),
  }),
  async ({ ids, flagId }, { supabase }) => {
    const { data, error } = await supabase
      .from("products")
      .update({ flag_id: flagId })
      .in("id", ids)
      .select("slug");
    if (error) throw error;
    revalidateCatalog({ productSlugs: data.map((row) => row.slug) });
    return { updated: data.length };
  },
);
