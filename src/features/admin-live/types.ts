/** Alertas del panel (las genera la base) y mensajes del chat entre admins. */

export const ALERT_KINDS = ["order_new", "order_status", "stock_low", "stock_out"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export type LiveAlert = {
  id: string;
  kind: AlertKind | "chat";
  title: string;
  body: string | null;
  href: string | null;
  /** Quién lo causó (null = cliente o tarea automática). */
  actorId: string | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  /** Mensaje propio que aún no confirma la base. */
  pending?: boolean;
};

/**
 * Cómo se presenta cada tipo, al estilo de las notificaciones de iOS: nombre de
 * la «app» y color del ícono. Los colores salen de los tokens del tema.
 */
export const ALERT_META: Record<LiveAlert["kind"], { app: string; tone: AlertTone }> = {
  order_new: { app: "Pedidos", tone: "green" },
  order_status: { app: "Pedidos", tone: "blue" },
  stock_low: { app: "Inventario", tone: "amber" },
  stock_out: { app: "Inventario", tone: "red" },
  chat: { app: "Chat", tone: "violet" },
};

export type AlertTone = "green" | "blue" | "amber" | "red" | "violet";
