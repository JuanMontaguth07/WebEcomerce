import "server-only";
import { siteConfig } from "@/config/site";
import { getOrderByToken, type PublicOrder } from "@/features/orders/queries";
import { getStoreSettings } from "@/features/store-settings/queries";
import { adminNotifyEmails, emailEnabled, sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/seo";
import type { createClient } from "@/lib/supabase/server";
import {
  adminOrderEmail,
  orderReceivedEmail,
  orderStatusEmail,
  receiptRejectedEmail,
  type EmailOrder,
  type EmailStore,
  type NotifiedStatus,
} from "./templates";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Los correos que manda la tienda (pedido recibido, cambios de estado,
 * comprobante rechazado y avisos a los admins). Se llaman dentro de `after()`
 * para no demorar la respuesta; sin Resend configurado no hacen nada.
 */

async function emailStore(): Promise<EmailStore> {
  const settings = await getStoreSettings();
  return {
    name: siteConfig.name,
    siteUrl: absoluteUrl("/"),
    whatsappNumber: settings.whatsappNumber,
    supportEmail: settings.supportEmail,
    nequiNumber: settings.nequiNumber,
    nequiHolder: settings.nequiHolder,
  };
}

const fromPublic = (order: PublicOrder): EmailOrder => ({
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  city: order.city,
  department: order.department,
  address: order.address,
  subtotal: order.subtotal,
  shippingCost: order.shippingCost,
  total: order.total,
  items: order.items.map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    subtotal: item.subtotal,
  })),
});

async function notifyAdmins(kind: "order" | "receipt", order: EmailOrder, orderId: string) {
  const admins = adminNotifyEmails();
  if (!admins.length) return;
  const store = await emailStore();
  const email = adminOrderEmail(kind, order, store, absoluteUrl(`/admin/pedidos/${orderId}`));
  await sendEmail({ to: admins, ...email });
}

/** Pedido recién creado: confirmación al cliente (con su enlace) y aviso a los admins. */
export async function notifyOrderPlaced(orderId: string, token: string) {
  if (!emailEnabled()) return;
  const order = await getOrderByToken(orderId, token);
  if (!order) return;
  const store = await emailStore();
  const email = orderReceivedEmail(
    fromPublic(order),
    store,
    absoluteUrl(`/pedido/${orderId}?t=${token}`),
  );
  await Promise.all([
    sendEmail({ to: order.customerEmail, replyTo: store.supportEmail, ...email }),
    notifyAdmins("order", fromPublic(order), orderId),
  ]);
}

/** El cliente subió un comprobante: aviso a los admins. */
export async function notifyReceiptUploaded(orderId: string, token: string) {
  if (!emailEnabled()) return;
  const order = await getOrderByToken(orderId, token);
  if (!order || order.receipt?.status !== "pending") return;
  await notifyAdmins("receipt", fromPublic(order), orderId);
}

export type AdminOrderForEmail = EmailOrder & { customerEmail: string };

/** Lo que necesitan los correos de un pedido, leído con la sesión del admin. */
export async function orderForEmail(
  supabase: Supabase,
  orderId: string,
): Promise<AdminOrderForEmail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "order_number, customer_name, customer_email, city, department, address, subtotal, shipping_cost, total, items:order_items(product_name, quantity, subtotal)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    orderNumber: Number(data.order_number),
    customerName: data.customer_name,
    customerEmail: data.customer_email,
    city: data.city,
    department: data.department,
    address: data.address,
    subtotal: Number(data.subtotal),
    shippingCost: data.shipping_cost === null ? null : Number(data.shipping_cost),
    total: Number(data.total),
    items: data.items.map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),
  };
}

/** Al cliente: su pedido se confirmó, se despachó o se canceló. */
export async function notifyOrderStatus(
  order: AdminOrderForEmail,
  status: NotifiedStatus,
  note?: string | null,
) {
  if (!emailEnabled()) return;
  const store = await emailStore();
  await sendEmail({
    to: order.customerEmail,
    replyTo: store.supportEmail,
    ...orderStatusEmail(order, status, store, note),
  });
}

/** Al cliente: el comprobante no sirvió, con el motivo. */
export async function notifyReceiptRejected(order: AdminOrderForEmail, reason: string) {
  if (!emailEnabled()) return;
  const store = await emailStore();
  await sendEmail({
    to: order.customerEmail,
    replyTo: store.supportEmail,
    ...receiptRejectedEmail(order, reason, store),
  });
}

export const NOTIFIED_STATUSES = ["confirmed", "shipped", "cancelled"] as const;
export const isNotifiedStatus = (status: string): status is NotifiedStatus =>
  (NOTIFIED_STATUSES as readonly string[]).includes(status);
