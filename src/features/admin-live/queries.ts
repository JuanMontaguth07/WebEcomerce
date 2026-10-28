import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toAlert, toMessage } from "./mappers";
import { ALERT_KINDS, type AlertKind, type ChatMessage, type LiveAlert } from "./types";

export type AdminLiveData = {
  alerts: LiveAlert[];
  messages: ChatMessage[];
  alertsReadAt: string | null;
  chatReadAt: string | null;
  /** Hasta cuándo leyó el chat cada admin, para el «Visto». */
  teamChatReads: Record<string, string>;
};

const isAlertKind = (value: string): value is AlertKind =>
  (ALERT_KINDS as readonly string[]).includes(value);

/** Lo que el panel muestra al abrir: alertas recientes, el chat y lo ya leído. */
export async function getAdminLiveData(userId: string): Promise<AdminLiveData> {
  const supabase = await createClient();
  const [alerts, messages, reads] = await Promise.all([
    supabase
      .from("admin_alerts")
      .select("id, kind, title, body, href, actor_id, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("admin_messages")
      .select("id, author_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    // La RLS deja a cada admin ver las lecturas de todo el equipo.
    supabase.from("admin_reads").select("user_id, alerts_read_at, chat_read_at"),
  ]);
  if (alerts.error) throw alerts.error;
  if (messages.error) throw messages.error;
  if (reads.error) throw reads.error;
  const own = reads.data.find((row) => row.user_id === userId);

  return {
    alerts: alerts.data.filter((row) => isAlertKind(row.kind)).map(toAlert),
    messages: messages.data.reverse().map(toMessage),
    alertsReadAt: own?.alerts_read_at ?? null,
    chatReadAt: own?.chat_read_at ?? null,
    teamChatReads: Object.fromEntries(reads.data.map((row) => [row.user_id, row.chat_read_at])),
  };
}
