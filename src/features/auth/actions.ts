"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "./paths";
import { signInSchema } from "./schemas";

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
