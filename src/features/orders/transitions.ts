import type { Database } from "@/lib/supabase/database.types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmado",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/**
 * Transiciones válidas de un pedido. Refleja `private.order_transition_allowed`
 * en la base de datos (una prueba verifica que coincidan).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Texto del botón para pasar a cada estado. */
export const TRANSITION_ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "Marcar pendiente",
  confirmed: "Confirmar pedido",
  preparing: "Pasar a preparación",
  shipped: "Marcar como enviado",
  delivered: "Marcar como entregado",
  cancelled: "Cancelar pedido",
};
