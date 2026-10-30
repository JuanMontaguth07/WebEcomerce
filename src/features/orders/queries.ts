import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

import type { OrderStatus } from "./transitions";

export { ORDER_STATUS_LABELS, type OrderStatus } from "./transitions";

export type PublicOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  department: string;
  city: string;
  address: string;
  notes: string | null;
  subtotal: number;
  shippingCost: number | null;
  total: number;
  createdAt: string;
  /** Hasta cuándo se mantiene la reserva de un pedido pendiente (null si ya no aplica). */
  expiresAt: string | null;
  /** El último comprobante de pago que subió el cliente (sin la imagen), o null. */
  receipt: {
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    reviewNote: string | null;
  } | null;
  items: {
    /** null si el producto se eliminó después de la compra. */
    productId: string | null;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pedido visible para quien tenga su token (cliente invitado). Sin caché: es
 * información personal y debe reflejar el estado actual.
 */
export async function getOrderByToken(orderId: string, token: string): Promise<PublicOrder | null> {
  if (!UUID.test(orderId) || !/^[0-9a-f]{64}$/.test(token)) return null;

  const { data, error } = await createPublicClient({ retry: true }).rpc("get_order_by_token", {
    p_order_id: orderId,
    p_token: token,
  });
  if (error) throw error;
  if (!data) return null;

  const raw = data as Record<string, unknown> & {
    items: Record<string, unknown>[];
    receipt: { status: string; created_at: string; review_note: string | null } | null;
  };
  return {
    id: String(raw.id),
    orderNumber: Number(raw.order_number),
    status: raw.status as OrderStatus,
    customerName: String(raw.customer_name),
    customerEmail: String(raw.customer_email),
    department: String(raw.department),
    city: String(raw.city),
    address: String(raw.address),
    notes: (raw.notes as string | null) ?? null,
    subtotal: Number(raw.subtotal),
    shippingCost: raw.shipping_cost === null ? null : Number(raw.shipping_cost),
    total: Number(raw.total),
    createdAt: String(raw.created_at),
    expiresAt: typeof raw.expires_at === "string" ? raw.expires_at : null,
    receipt:
      raw.receipt && ["pending", "approved", "rejected"].includes(raw.receipt.status)
        ? {
            status: raw.receipt.status as "pending" | "approved" | "rejected",
            createdAt: raw.receipt.created_at,
            reviewNote: raw.receipt.review_note,
          }
        : null,
    items: raw.items.map((item) => ({
      productId: typeof item.product_id === "string" ? item.product_id : null,
      productName: String(item.product_name),
      sku: String(item.sku),
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      subtotal: Number(item.subtotal),
    })),
  };
}
