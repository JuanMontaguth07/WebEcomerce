import "server-only";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_HOME } from "./paths";

/**
 * Capa de acceso a la sesión. Toda verificación de identidad o rol pasa por
 * aquí; proxy.ts solo hace una comprobación optimista.
 */

export type SessionUser = { id: string; email: string | null };
export type AdminUser = SessionUser & { fullName: string | null };

/** Usuario autenticado según el JWT verificado (getClaims), o null. Memorizado por petición. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  const email = data.claims.email;
  return { id: sub, email: typeof email === "string" ? email : null };
});

/** El usuario actual si es administrador (rol leído de la base de datos), o null. */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (data?.role !== "admin") return null;
  return { ...user, fullName: data.full_name };
});

/** Para páginas del panel: redirige a /ingresar si no hay sesión o no es administrador. */
export async function requireAdmin(currentPath: string = ADMIN_HOME): Promise<AdminUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(currentPath)}` as Route);

  const admin = await getAdminUser();
  if (!admin) redirect("/ingresar?error=sin-permiso");
  return admin;
}
