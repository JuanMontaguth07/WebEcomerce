"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminAction } from "@/lib/admin-action";
import { AppError } from "@/lib/errors";
import { buildCodeFrom, FEATURED_BUILDS_TAG } from "./featured";

const details = {
  title: z.string().trim().min(3, "Escribe un título (mínimo 3 letras).").max(60),
  tag: z
    .string()
    .trim()
    .max(30)
    .transform((value) => value || null)
    .refine((value) => value === null || value.length >= 2, "La etiqueta es muy corta."),
  description: z
    .string()
    .trim()
    .max(240)
    .transform((value) => value || null),
};

/** Destaca una configuración guardada (por su enlace o código) como PC ya armada. */
export const addFeaturedBuild = adminAction(
  z.object({ link: z.string().trim().min(1, "Pega el enlace o el código."), ...details }),
  async ({ link, title, tag, description }, { supabase }) => {
    const code = buildCodeFrom(link);
    if (!code) {
      throw new AppError("VALIDATION", {
        details: {
          link: ["Pega el enlace de «Guardar y compartir» o su código de 12 caracteres."],
        },
      });
    }
    const { data: build, error } = await supabase
      .from("builds")
      .select("id")
      .eq("share_code", code)
      .maybeSingle();
    if (error) throw error;
    if (!build) {
      throw new AppError("VALIDATION", { details: { link: ["No encontré esa configuración."] } });
    }
    const { data: last } = await supabase
      .from("featured_builds")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error: insertError } = await supabase.from("featured_builds").insert({
      build_id: build.id,
      title,
      tag,
      description,
      position: (last?.position ?? 0) + 10,
    });
    if (insertError?.code === "23505") {
      throw new AppError("VALIDATION", {
        details: { link: ["Esa configuración ya está recomendada."] },
      });
    }
    if (insertError) throw insertError;
    updateTag(FEATURED_BUILDS_TAG);
    return { code };
  },
);

export const updateFeaturedBuild = adminAction(
  z.object({ id: z.uuid(), isActive: z.boolean(), ...details }),
  async ({ id, title, tag, description, isActive }, { supabase }) => {
    const { error } = await supabase
      .from("featured_builds")
      .update({ title, tag, description, is_active: isActive })
      .eq("id", id);
    if (error) throw error;
    updateTag(FEATURED_BUILDS_TAG);
    return { id };
  },
);

export const deleteFeaturedBuild = adminAction(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    const { error } = await supabase.from("featured_builds").delete().eq("id", id);
    if (error) throw error;
    updateTag(FEATURED_BUILDS_TAG);
    return { id };
  },
);

export const reorderFeaturedBuilds = adminAction(
  z.object({ ids: z.array(z.uuid()).min(1).max(50) }),
  async ({ ids }, { supabase }) => {
    const results = await Promise.all(
      ids.map((id, index) =>
        supabase
          .from("featured_builds")
          .update({ position: (index + 1) * 10 })
          .eq("id", id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    updateTag(FEATURED_BUILDS_TAG);
    return { count: ids.length };
  },
);
