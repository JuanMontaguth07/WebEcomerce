import type { AlertKind, ChatMessage, ChatReaction, LiveAlert, MessageReaction } from "./types";

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
  reply_to?: string | null;
  created_at: string;
}): ChatMessage {
  return {
    id: row.id,
    authorId: row.author_id,
    body: row.body,
    replyTo: row.reply_to ?? null,
    createdAt: row.created_at,
  };
}

export function toReaction(row: {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}): MessageReaction {
  return {
    id: row.id,
    messageId: row.message_id,
    userId: row.user_id,
    emoji: row.emoji as ChatReaction,
  };
}
