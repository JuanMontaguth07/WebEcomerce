"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminAction } from "@/lib/admin-action";
import { AppError } from "@/lib/errors";
import { CATALOG_BUCKET } from "@/lib/images";
import { BANNERS_TAG } from "./queries";
import { bannerSchema } from "./schemas";

type AdminSupabase = Parameters<Parameters<typeof adminAction>[1]>[1]["supabase"];

async function removeImage(supabase: AdminSupabase, path: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from(CATALOG_BUCKET).remove([path]);
  if (error)
    console.error("[storage] imagen de anuncio sin borrar", { path, error: error.message });
}

export const saveBanner = adminAction(bannerSchema, async (values, { supabase }) => {
  const row = {
    eyebrow: values.eyebrow,
    title: values.title,
    body: values.body,
    cta_label: values.ctaLabel,
    cta_href: values.ctaHref,
    image_path: values.imagePath,
    illustration: values.illustration,
    is_active: values.isActive,
  };

  if (!values.id) {
    // Los nuevos van al final.
    const { data: last } = await supabase
      .from("home_banners")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("home_banners")
      .insert({ ...row, position: Math.min(1000, (last?.position ?? 0) + 10) })
      .select("id")
      .single();
    if (error) throw error;
    updateTag(BANNERS_TAG);
    return { id: data.id };
  }

  const { data: previous } = await supabase
    .from("home_banners")
    .select("image_path")
    .eq("id", values.id)
    .maybeSingle();
  if (!previous) throw new AppError("NOT_FOUND");

  const { error } = await supabase.from("home_banners").update(row).eq("id", values.id);
  if (error) throw error;
  if (previous.image_path !== values.imagePath) await removeImage(supabase, previous.image_path);
  updateTag(BANNERS_TAG);
  return { id: values.id };
});

export const deleteBanner = adminAction(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    const { data, error } = await supabase
      .from("home_banners")
      .delete()
      .eq("id", id)
      .select("image_path")
      .single();
    if (error) throw error;
    await removeImage(supabase, data.image_path);
    updateTag(BANNERS_TAG);
    return { id };
  },
);

/** Guarda el nuevo orden (de arriba abajo) reasignando posiciones de 10 en 10. */
export const reorderBanners = adminAction(
  z.object({ ids: z.array(z.uuid()).min(1).max(50) }),
  async ({ ids }, { supabase }) => {
    const results = await Promise.all(
      ids.map((id, index) =>
        supabase
          .from("home_banners")
          .update({ position: (index + 1) * 10 })
          .eq("id", id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    updateTag(BANNERS_TAG);
    return { count: ids.length };
  },
);
