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
  status: OrderStatus;
  itemCount: number;
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
      "id, order_number, created_at, customer_name, customer_email, city, department, total, status, items:order_items(count)",
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
    status: row.status,
    itemCount: row.items[0]?.count ?? 0,
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

/** Últimos pedidos para el resumen del panel. */
export async function getRecentOrders(limit = 6) {
  const { orders } = await listOrders({ page: 1 });
  return orders.slice(0, limit);
}
