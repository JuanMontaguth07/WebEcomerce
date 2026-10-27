/** Estado de un administrador en el panel: en línea (pestaña activa) o ausente. */
export type PresenceStatus = "online" | "away";

/** Lo que cada pestaña del panel anuncia en el canal de presencia. */
export type PresenceMeta = { name: string; initials: string; status: PresenceStatus };

export type OnlineAdmin = PresenceMeta & { id: string };

/** Canal privado de Realtime (sus políticas están en la migración admin_presence). */
export const PRESENCE_CHANNEL = "admin-presence";

/**
 * Un admin puede tener el panel abierto en varias pestañas o equipos: está en
 * línea si alguna está activa, y ausente si todas están en segundo plano.
 */
export function mergePresence(id: string, metas: PresenceMeta[]): OnlineAdmin | null {
  const [first] = metas;
  if (!first) return null;
  const online = metas.some((meta) => meta.status === "online");
  return { id, name: first.name, initials: first.initials, status: online ? "online" : "away" };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** «Visto hace 5 min», «hace 3 h», «ayer» o la fecha, según cuánto pasó. */
export function formatLastSeen(seenAt: string, now: number): string {
  const elapsed = Math.max(0, now - new Date(seenAt).getTime());
  if (elapsed < MINUTE) return "Visto hace un momento";
  if (elapsed < HOUR) return `Visto hace ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `Visto hace ${Math.floor(elapsed / HOUR)} h`;
  if (elapsed < 2 * DAY) return "Visto ayer";
  const date = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  }).format(new Date(seenAt));
  return `Visto el ${date}`;
}
