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
  limit = 1000,
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

/** Números de pedido citados con # (sin repetir, como mucho 5). */
export function orderNumbers(body: string): number[] {
  const found = [...body.matchAll(/(?<![\p{L}\p{N}&])#(\d{3,9})(?!\d)/gu)].map((match) =>
    Number(match[1]),
  );
  return [...new Set(found)].slice(0, 5);
}

/**
 * Cómo se menciona a cada admin: su primer nombre, o el nombre completo si dos
 * comparten el primero.
 */
export function mentionHandles(
  team: { id: string; name: string }[],
): { userId: string; handle: string }[] {
  const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;
  return team.map((member) => {
    const shared = team.filter(
      (other) => first(other.name).toLowerCase() === first(member.name).toLowerCase(),
    );
    return {
      userId: member.id,
      handle: shared.length > 1 ? member.name.trim() : first(member.name),
    };
  });
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type MessageToken =
  | { type: "text"; text: string }
  | { type: "order"; text: string; number: number }
  | { type: "mention"; text: string; userId: string };

/** Parte el texto en trozos: texto, pedidos (#1042) y menciones (@Ana). */
export function tokenize(
  body: string,
  handles: { userId: string; handle: string }[],
): MessageToken[] {
  const sorted = [...handles].sort((a, b) => b.handle.length - a.handle.length);
  const names = sorted.map((item) => escapeRegExp(item.handle)).join("|");
  const pattern = new RegExp(
    `${names ? `@(${names})(?![\\p{L}\\p{N}])|` : ""}(?<![\\p{L}\\p{N}&])#(\\d{3,9})(?!\\d)`,
    "giu",
  );
  const tokens: MessageToken[] = [];
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) tokens.push({ type: "text", text: body.slice(cursor, start) });
    if (match[1] !== undefined) {
      const handle = match[1].toLowerCase();
      const userId = sorted.find((item) => item.handle.toLowerCase() === handle)?.userId ?? "";
      tokens.push({ type: "mention", text: match[0], userId });
    } else {
      tokens.push({ type: "order", text: match[0], number: Number(match[2]) });
    }
    cursor = start + match[0].length;
  }
  if (cursor < body.length) tokens.push({ type: "text", text: body.slice(cursor) });
  return tokens;
}

/** Admins mencionados en un texto (para guardarlos con el mensaje). */
export function mentionsIn(body: string, handles: { userId: string; handle: string }[]): string[] {
  return [
    ...new Set(
      tokenize(body, handles).flatMap((token) => (token.type === "mention" ? [token.userId] : [])),
    ),
  ];
}

/** Si el cursor está escribiendo una mención («hola @an|»), dónde empieza y qué se busca. */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([\p{L}\p{N}]{0,20})$/u.exec(before);
  if (!match) return null;
  return { start: before.length - match[2]!.length - 1, query: match[2]! };
}

/** Qué se lleva al chat al comentar una alerta: el pedido (#1042) o el producto. */
export function chatSeedFor(
  alert: Pick<LiveAlert, "title" | "href">,
): { text: string; productId: string | null } | null {
  const product = /^\/admin\/productos\/([0-9a-f-]{36})$/.exec(alert.href ?? "");
  if (product) return { text: "", productId: product[1]! };
  const order = /#(\d{3,9})/.exec(alert.title);
  return order ? { text: `#${order[1]} `, productId: null } : null;
}

/** Id del pedido o producto al que apunta una alerta (para refrescar su tarjeta). */
export function alertTarget(href: string | null): { kind: "order" | "product"; id: string } | null {
  const match = /^\/admin\/(pedidos|productos)\/([0-9a-f-]{36})$/.exec(href ?? "");
  if (!match) return null;
  return { kind: match[1] === "pedidos" ? "order" : "product", id: match[2]! };
}
