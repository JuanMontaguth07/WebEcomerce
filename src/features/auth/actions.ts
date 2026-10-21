"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "./session";
import { safeNextPath } from "./paths";
import { newPasswordSchema, resetRequestSchema, signInSchema } from "./schemas";

export type SignInState = {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
  email?: string;
};

const GENERIC_ERROR = "Correo o contraseña incorrectos.";

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    if (error?.status === 429 || error?.code === "over_request_rate_limit") {
      return { error: "Demasiados intentos seguidos. Espera unos minutos.", email };
    }
    // Credenciales incorrectas: mensaje genérico que no revela si el correo existe.
    if (!error || error.code === "invalid_credentials" || error.status === 400) {
      return { error: GENERIC_ERROR, email };
    }
    // Cualquier otro fallo (configuración, red) se registra para poder diagnosticarlo.
    console.error("[signIn]", error.status, error.code, error.message);
    return {
      error: "No pudimos iniciar sesión en este momento. Inténtalo de nuevo en unos minutos.",
      email,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel.", email };
  }

  redirect(safeNextPath(formData.get("next")) as Route);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/ingresar");
}

export type ResetRequestState = {
  sent?: boolean;
  error?: string;
  fieldErrors?: { email?: string[] };
};

/**
 * Envía el enlace para restablecer la contraseña. La respuesta es la misma
 * exista o no la cuenta, para no revelar qué correos están registrados.
 */
export async function requestPasswordReset(
  _previous: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/ingresar/nueva-clave`,
  });
  if (error?.status === 429) {
    return { error: "Ya enviamos un enlace hace poco. Espera unos minutos y revisa tu correo." };
  }
  if (error) console.error("[requestPasswordReset]", error.status, error.code, error.message);
  return { sent: true };
}

export type NewPasswordState = {
  error?: string;
  fieldErrors?: { password?: string[]; confirm?: string[] };
};

export async function updatePassword(
  _previous: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar?error=enlace-invalido");

  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: ["Usa una contraseña distinta a la anterior."] } };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: ["La contraseña no cumple la política de seguridad."] } };
    }
    console.error("[updatePassword]", error.status, error.code, error.message);
    return { error: "No pudimos actualizar la contraseña. Solicita un enlace nuevo." };
  }
  redirect("/admin");
}
