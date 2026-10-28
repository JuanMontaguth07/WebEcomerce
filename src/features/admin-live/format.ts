import {
  CHAT_REACTION_KEYS,
  type ChatMessage,
  type ChatReaction,
  type LiveAlert,
  type MessageReaction,
} from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const time = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});
const dayFormat = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Bogota",
});

/** «ahora», «hace 5 min», «hace 2 h» o la hora del día, como en iOS. */
export function timeAgo(iso: string, now: number): string {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  if (elapsed < MINUTE) return "ahora";
  if (elapsed < HOUR) return `hace ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < 6 * HOUR) return `hace ${Math.floor(elapsed / HOUR)} h`;
  return time.format(new Date(iso));
}

/** Clave del día en Bogotá (AAAA-MM-DD) para agrupar. */
function dayKey(iso: string | number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(iso));
}

/** Nombre de un día relativo a hoy: «Hoy», «Ayer» o «martes, 20 de octubre». */
export function dayLabel(iso: string, now: number): string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return "Hoy";
  if (key === dayKey(now - DAY)) return "Ayer";
  const label = dayFormat.format(new Date(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Agrupa por día conservando el orden recibido. */
export function groupByDay<T extends { createdAt: string }>(
  items: T[],
  now: number,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt, now);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

/** Hora corta de un mensaje: «3:05 p. m.». */
export function messageTime(iso: string): string {
  return time.format(new Date(iso));
}

/** Alertas que le cuentan a un admin: las que no causó él y llegaron después de leer. */
export function unreadAlerts(alerts: LiveAlert[], selfId: string, readAt: string | null): number {
  const since = readAt ? new Date(readAt).getTime() : 0;
  return alerts.filter(
    (alert) => alert.actorId !== selfId && new Date(alert.createdAt).getTime() > since,
  ).length;
}

/** Mensajes de otros admins posteriores a la última lectura del chat. */
export function unreadMessages(
  messages: ChatMessage[],
  selfId: string,
  readAt: string | null,
): number {
  const since = readAt ? new Date(readAt).getTime() : 0;
  return messages.filter(
    (message) => message.authorId !== selfId && new Date(message.createdAt).getTime() > since,
  ).length;
}

/**
 * Agrega un mensaje sin duplicarlo (llega por Realtime y también como
 * confirmación del envío propio) y mantiene el orden por hora.
 */
export function mergeMessage(
  messages: ChatMessage[],
  incoming: ChatMessage,
  limit = 200,
): ChatMessage[] {
  const without = messages.filter((message) => message.id !== incoming.id);
  return [...without, incoming]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
}

/** Mensajes seguidos del mismo autor (para no repetir el nombre en cada burbuja). */
export function isContinuation(previous: ChatMessage | undefined, message: ChatMessage): boolean {
  return (
    previous !== undefined &&
    previous.authorId === message.authorId &&
    new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * MINUTE
  );
}

const at = (iso: string) => new Date(iso).getTime();

/** Quiénes leyeron ya un mensaje, según hasta cuándo leyó el chat cada uno. */
export function seenBy<T extends { id: string }>(
  people: T[],
  reads: Record<string, string>,
  message: ChatMessage,
): T[] {
  return people.filter((person) => {
    const read = reads[person.id];
    return read !== undefined && at(read) >= at(message.createdAt);
  });
}

/** «Visto», «Visto por Ana», «Visto por Ana y Luis» o «Visto por todos». */
export function seenLabel(names: string[], others: number): string {
  if (others === 1 && names.length === 1) return "Visto";
  if (others > 1 && names.length === others) return "Visto por todos";
  const first = names.map((name) => name.split(" ")[0]);
  const list =
    first.length > 1 ? `${first.slice(0, -1).join(", ")} y ${first.at(-1)}` : (first[0] ?? "");
  return `Visto por ${list}`;
}

/** Primer mensaje de otro admin posterior a la última lectura (el separador «Nuevos»). */
export function firstUnread(
  messages: ChatMessage[],
  selfId: string,
  readAt: string | null,
): ChatMessage | undefined {
  const since = readAt ? at(readAt) : 0;
  return messages.find((message) => message.authorId !== selfId && at(message.createdAt) > since);
}

/** Mensajes de otros que llegaron después de un punto (los que hay más abajo sin ver). */
export function arrivedAfter(
  messages: ChatMessage[],
  selfId: string,
  after: string | null,
): number {
  if (!after) return 0;
  return messages.filter(
    (message) => message.authorId !== selfId && at(message.createdAt) > at(after),
  ).length;
}

/** Reacciones de un mensaje agrupadas por emoji, en el orden fijo del selector. */
export function reactionSummary(
  reactions: MessageReaction[],
  messageId: string,
  selfId: string,
): { emoji: ChatReaction; userIds: string[]; mine: boolean }[] {
  const own = reactions.filter((reaction) => reaction.messageId === messageId);
  return CHAT_REACTION_KEYS.flatMap((emoji) => {
    const userIds = own.filter((reaction) => reaction.emoji === emoji).map((r) => r.userId);
    return userIds.length ? [{ emoji, userIds, mine: userIds.includes(selfId) }] : [];
  });
}

/**
 * Agrega una reacción sin duplicarla: la misma persona, mensaje y emoji es una
 * sola (la confirmada reemplaza a la provisional, llegue por Realtime o no).
 */
export function mergeReaction(
  reactions: MessageReaction[],
  incoming: MessageReaction,
): MessageReaction[] {
  return [
    ...reactions.filter(
      (reaction) =>
        reaction.id !== incoming.id &&
        !(
          reaction.messageId === incoming.messageId &&
          reaction.userId === incoming.userId &&
          reaction.emoji === incoming.emoji
        ),
    ),
    incoming,
  ];
}

/** Texto corto de un mensaje en una sola línea, para citarlo. */
export function snippet(body: string, max = 90): string {
  const line = body.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
