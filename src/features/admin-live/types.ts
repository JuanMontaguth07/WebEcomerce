/** Alertas del panel (las genera la base) y mensajes del chat entre admins. */

import type { OrderStatus } from "@/features/orders/transitions";

export const ALERT_KINDS = ["order_new", "order_status", "stock_low", "stock_out"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export type LiveAlert = {
  id: string;
  kind: AlertKind | "chat" | "mention";
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
  /** Mensaje al que responde (cita). */
  replyTo?: string | null;
  /** Producto compartido (tarjeta bajo la burbuja). */
  productId?: string | null;
  /** Administradores mencionados con @. */
  mentions?: string[];
  createdAt: string;
  /** Mensaje propio que aún no confirma la base. */
  pending?: boolean;
};

/** Reacciones del chat (la base admite solo estas) y cómo las lee un lector de pantalla. */
export const CHAT_REACTIONS = {
  "👍": "Me gusta",
  "❤️": "Me encanta",
  "😂": "Me da risa",
  "👀": "Lo estoy viendo",
  "✅": "Hecho",
  "🔥": "Genial",
} as const;

export type ChatReaction = keyof typeof CHAT_REACTIONS;
export const CHAT_REACTION_KEYS = Object.keys(CHAT_REACTIONS) as ChatReaction[];

export type MessageReaction = {
  id: string;
  messageId: string;
  userId: string;
  emoji: ChatReaction;
  /** Propia y aún sin confirmar por la base. */
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
  mention: { app: "Menciones", tone: "pink" },
};

export type AlertTone = "green" | "blue" | "amber" | "red" | "violet" | "pink";

/** Pedido citado en el chat con su número (#1042). */
export type OrderRef = {
  id: string;
  number: number;
  status: OrderStatus;
  customer: string;
  total: number;
};

/** Producto compartido en el chat. */
export type ProductRef = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  image: { path: string; alt: string | null } | null;
};
