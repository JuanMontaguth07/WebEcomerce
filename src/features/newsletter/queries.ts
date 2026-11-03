import "server-only";
import { allRows } from "@/features/admin/import/context";
import { createClient } from "@/lib/supabase/server";

export type Subscriber = {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  source: string;
  consentVersion: string;
  consentedAt: string;
  unsubscribedAt: string | null;
};

/** Todos los suscritos (activos primero, los más recientes arriba), para el panel. */
export async function listSubscribers(): Promise<Subscriber[]> {
  const supabase = await createClient();
  const rows = await allRows((from, to) =>
    supabase
      .from("newsletter_subscribers")
      .select("id, email, status, source, consent_version, consented_at, unsubscribed_at")
      .order("status")
      .order("consented_at", { ascending: false })
      .range(from, to),
  );
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status as Subscriber["status"],
    source: row.source,
    consentVersion: row.consent_version,
    consentedAt: row.consented_at,
    unsubscribedAt: row.unsubscribed_at,
  }));
}
