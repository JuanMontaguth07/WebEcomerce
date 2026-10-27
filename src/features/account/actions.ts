"use server";

import { z } from "zod";
import { newPasswordSchema } from "@/features/auth/schemas";
import { adminAction } from "@/lib/admin-action";
import { AppError } from "@/lib/errors";
import { ADMIN_ACCENT_KEYS, ADMIN_FONT_KEYS } from "./preferences";

/** Nombre visible del administrador (también aparece en la actividad). */
export const updateProfile = adminAction(
  z.object({
    fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120, "Máximo 120 caracteres."),
  }),
  async ({ fullName }, { admin, supabase }) => {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", admin.id);
    if (error) throw error;
    return { fullName };
  },
);

/** Color de acento y fuente del panel: solo cambian la vista de este administrador. */
export const updateAdminPreferences = adminAction(
  z.object({
    accent: z.enum(ADMIN_ACCENT_KEYS as [string, ...string[]]),
    font: z.enum(ADMIN_FONT_KEYS as [string, ...string[]]),
  }),
  async ({ accent, font }, { admin, supabase }) => {
    const { error } = await supabase
      .from("profiles")
      .update({ admin_accent: accent, admin_font: font })
      .eq("id", admin.id);
    if (error) throw error;
    return { accent, font };
  },
);

/**
 * Cambia la contraseña pidiendo la actual: si alguien encuentra la sesión
 * abierta no puede quedarse con la cuenta.
 */
export const changePassword = adminAction(
  z
    .object({ current: z.string().min(1, "Escribe tu contraseña actual.").max(128) })
    .and(newPasswordSchema),
  async ({ current, password }, { admin, supabase }) => {
    if (!admin.email) throw new AppError("FORBIDDEN");

    const check = await supabase.auth.signInWithPassword({ email: admin.email, password: current });
    if (check.error) {
      if (check.error.status === 429) throw new AppError("RATE_LIMITED");
      throw new AppError("VALIDATION", {
        details: { current: ["La contraseña actual no es correcta."] },
      });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.code === "same_password") {
        throw new AppError("VALIDATION", {
          details: { password: ["Usa una contraseña distinta a la actual."] },
        });
      }
      if (error.code === "weak_password") {
        throw new AppError("VALIDATION", {
          details: { password: ["Esa contraseña es muy fácil de adivinar. Prueba otra."] },
        });
      }
      throw error;
    }
    return { changed: true };
  },
);
