import "server-only";
import { createClient } from "@/lib/supabase/server";
import { initials } from "./initials";
import { toAccent, type AdminAccent } from "./preferences";

/** Un administrador de la tienda, con su última vez en el panel. */
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  initials: string;
  /** Color que eligió en «Mi cuenta»; lo identifica en el chat y en el equipo. */
  accent: AdminAccent;
  /** Último pulso guardado (null si nunca abrió el panel desde que existe el registro). */
  lastSeen: string | null;
};

/** Administradores de la tienda, en orden de alta (RLS: solo un admin los ve). */
export async function getAdminTeam(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const [admins, seen] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, admin_accent")
      .eq("role", "admin")
      .order("created_at"),
    supabase.from("admin_last_seen").select("user_id, seen_at"),
  ]);
  if (admins.error) throw admins.error;
  if (seen.error) throw seen.error;
  const lastSeen = new Map(seen.data.map((row) => [row.user_id, row.seen_at]));
  return admins.data.map((person) => ({
    id: person.id,
    name: person.full_name ?? "Sin nombre",
    email: person.email,
    initials: initials({ fullName: person.full_name, email: person.email }),
    accent: toAccent(person.admin_accent),
    lastSeen: lastSeen.get(person.id) ?? null,
  }));
}
