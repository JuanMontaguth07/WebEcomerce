import type { AlertKind, ChatMessage, LiveAlert } from "./types";

/** Filas de la base (consulta inicial o Realtime) al formato del panel. */
export function toAlert(row: {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  actor_id: string | null;
  created_at: string;
}): LiveAlert {
  return {
    id: row.id,
    kind: row.kind as AlertKind,
    title: row.title,
    body: row.body,
    href: row.href,
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}

export function toMessage(row: {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}): ChatMessage {
  return { id: row.id, authorId: row.author_id, body: row.body, createdAt: row.created_at };
}
