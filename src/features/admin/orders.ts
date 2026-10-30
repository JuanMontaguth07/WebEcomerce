import "server-only";
import type { OrderStatus } from "@/features/orders/transitions";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_PAGE_SIZE, sanitizeSearch } from "./shared";

export type AdminOrderRow = {
  id: string;
  orderNumber: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  city: string;
  department: string;
  total: number;
  shippingCost: number | null;
  status: OrderStatus;
  expiresAt: string | null;
  /** Minutos que le quedan a la reserva de un pedido pendiente. */
  expiresInMinutes: number | null;
  itemCount: number;
  /** El cliente subió un comprobante que falta revisar. */
  receiptPending: boolean;
};

export async function listOrders({
  status,
  q,
  page = 1,
}: {
  status?: OrderStatus;
  q?: string;
  page?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, created_at, customer_name, customer_email, city, department, total, shipping_cost, status, expires_at, items:order_items(count), receipts:payment_receipts(status)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);
  const search = sanitizeSearch(q);
  if (search) {
    const number = Number(search.replace(/^#/, ""));
    query =
      Number.isInteger(number) && number > 0
        ? query.eq("order_number", number)
        : query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const orders: AdminOrderRow[] = data.map((row) => ({
    id: row.id,
    orderNumber: Number(row.order_number),
    createdAt: row.created_at,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    city: row.city,
    department: row.department,
    total: Number(row.total),
    shippingCost: row.shipping_cost === null ? null : Number(row.shipping_cost),
    status: row.status,
    expiresAt: row.expires_at,
    expiresInMinutes: row.expires_at
      ? Math.max(0, Math.round((Date.parse(row.expires_at) - Date.now()) / 60_000))
      : null,
    itemCount: row.items[0]?.count ?? 0,
    receiptPending: row.receipts.some((receipt) => receipt.status === "pending"),
  }));
  return {
    orders,
    total: count ?? 0,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)),
  };
}

export async function getAdminOrder(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
       items:order_items(id, product_id, product_name, sku, unit_price, quantity, subtotal,
         product:products(slug)),
       history:order_status_history(id, from_status, to_status, note, created_at,
         author:profiles(full_name, email))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    orderNumber: Number(data.order_number),
    items: data.items.map((item) => ({ ...item, slug: item.product?.slug ?? null })),
    history: [...data.history].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

/** Pedidos pendientes de pago (contador del menú del panel). */
export async function getPendingOrderCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

/** Últimos pedidos para el resumen del panel. */
export async function getRecentOrders(limit = 6) {
  const { orders } = await listOrders({ page: 1 });
  return orders.slice(0, limit);
}

export type ExportOrder = {
  orderNumber: number;
  createdAt: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string | null;
  department: string;
  city: string;
  address: string;
  items: string;
  subtotal: number;
  shippingCost: number | null;
  total: number;
};

/** Todos los pedidos que coinciden con el filtro, con datos de contacto y productos (CSV). */
export async function listOrdersForExport({
  status,
  q,
  maxRows = 20_000,
}: {
  status?: OrderStatus;
  q?: string;
  maxRows?: number;
}): Promise<ExportOrder[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const rows: ExportOrder[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    let query = supabase
      .from("orders")
      .select(
        `order_number, created_at, status, customer_name, customer_email, customer_phone,
         customer_document, department, city, address, subtotal, shipping_cost, total,
         items:order_items(product_name, sku, quantity)`,
      )
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (status) query = query.eq("status", status);
    const search = sanitizeSearch(q);
    if (search) {
      const number = Number(search.replace(/^#/, ""));
      query =
        Number.isInteger(number) && number > 0
          ? query.eq("order_number", number)
          : query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    for (const row of data) {
      rows.push({
        orderNumber: Number(row.order_number),
        createdAt: row.created_at,
        status: row.status,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        customerDocument: row.customer_document,
        department: row.department,
        city: row.city,
        address: row.address,
        items: row.items
          .map((item) => `${item.quantity} × ${item.product_name} (${item.sku})`)
          .join(" | "),
        subtotal: Number(row.subtotal),
        shippingCost: row.shipping_cost === null ? null : Number(row.shipping_cost),
        total: Number(row.total),
      });
    }
    if (data.length < pageSize) break;
  }
  return rows;
}
