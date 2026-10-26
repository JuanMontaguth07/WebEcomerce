"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { translateDbError } from "@/features/admin/shared";
import { revalidateCatalog } from "@/features/catalog/revalidate";
import { adminAction } from "@/lib/admin-action";
import { RARITIES_TAG } from "./queries";
import { raritySchema } from "./schemas";

const UNIQUE = {
  rarities_name_key: { field: "name", message: "Ya existe una rareza con este nombre." },
  rarities_slug_key: { field: "slug", message: "Ya existe una rareza con este slug." },
};

/** Las tarjetas de toda la tienda muestran la rareza: se invalida también el catálogo. */
function revalidateRarities() {
  updateTag(RARITIES_TAG);
  revalidateCatalog();
}

export const saveRarity = adminAction(raritySchema, async (values, { supabase }) => {
  const row = {
    name: values.name,
    slug: values.slug,
    color: values.color,
    effect: values.effect,
    description: values.description,
    position: values.position,
    is_active: values.isActive,
  };
  const { data, error } = values.id
    ? await supabase.from("rarities").update(row).eq("id", values.id).select("id").single()
    : await supabase.from("rarities").insert(row).select("id").single();
  if (error) translateDbError(error, { uniqueFields: UNIQUE });
  revalidateRarities();
  return { id: data.id };
});

export const deleteRarity = adminAction(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    // Los productos que la usaban quedan sin rareza (ON DELETE SET NULL).
    const { error } = await supabase.from("rarities").delete().eq("id", id);
    if (error) throw error;
    revalidateRarities();
    return { id };
  },
);

/** Asigna (o quita, con null) la rareza de varios productos a la vez. */
export const setProductsRarity = adminAction(
  z.object({
    ids: z.array(z.uuid()).min(1, "Selecciona al menos un producto.").max(100),
    rarityId: z.uuid().nullable(),
  }),
  async ({ ids, rarityId }, { supabase }) => {
    const { data, error } = await supabase
      .from("products")
      .update({ rarity_id: rarityId })
      .in("id", ids)
      .select("slug");
    if (error) throw error;
    revalidateCatalog({ productSlugs: data.map((row) => row.slug) });
    return { updated: data.length };
  },
);
