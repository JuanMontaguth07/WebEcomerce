/** Estado de un administrador en el panel: en línea (pestaña activa) o ausente. */
export type PresenceStatus = "online" | "away";

/** Desde dónde tiene abierto el panel. Tabletas cuentan como celular. */
export type PresenceDevice = "desktop" | "mobile";

/** Lo que cada pestaña del panel anuncia en el canal de presencia. */
export type PresenceMeta = {
  name: string;
  initials: string;
  status: PresenceStatus;
  device: PresenceDevice;
};

export type OnlineAdmin = PresenceMeta & { id: string };

/** Canal privado de Realtime (sus políticas están en la migración admin_presence). */
export const PRESENCE_CHANNEL = "admin-presence";

/** Celular o tableta según el navegador (userAgentData si existe, si no el user agent). */
export function detectDevice(navigator: {
  userAgent: string;
  maxTouchPoints?: number;
  userAgentData?: { mobile?: boolean };
}): PresenceDevice {
  if (navigator.userAgentData?.mobile) return "mobile";
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua)) return "mobile";
  // iPadOS se presenta como Mac, pero con pantalla táctil.
  if (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return "mobile";
  return "desktop";
}

/**
 * Un admin puede tener el panel abierto en varias pestañas o equipos: está en
 * línea si alguna está activa y ausente si todas están en segundo plano. Como en
 * Discord, se muestra «celular» solo si no está activo en un computador.
 */
export function mergePresence(id: string, metas: PresenceMeta[]): OnlineAdmin | null {
  const [first] = metas;
  if (!first) return null;
  const active = metas.filter((meta) => meta.status === "online");
  const relevant = active.length ? active : metas;
  return {
    id,
    name: first.name,
    initials: first.initials,
    status: active.length ? "online" : "away",
    device: relevant.some((meta) => meta.device !== "mobile") ? "desktop" : "mobile",
  };
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

export const STATUS_LABEL: Record<PresenceStatus | "offline", string> = {
  online: "En línea",
  away: "Ausente",
  offline: "Desconectado",
};

/** «En línea · en el celular», «Ausente · en el computador» o «Desconectado». */
export function presenceLabel(admin: OnlineAdmin | undefined): string {
  if (!admin) return STATUS_LABEL.offline;
  return `${STATUS_LABEL[admin.status]} · ${admin.device === "mobile" ? "en el celular" : "en el computador"}`;
}
