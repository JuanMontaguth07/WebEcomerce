import "server-only";
import { createClient } from "@/lib/supabase/server";

export const CUSTOMER_SEGMENTS = {
  recurrentes: { value: "frequent", label: "Recurrentes" },
  nuevos: { value: "new", label: "Nuevos (30 días)" },
  inactivos: { value: "inactive", label: "Sin comprar en 90 días" },
} as const;
export type CustomerSegment = keyof typeof CUSTOMER_SEGMENTS;

export const CUSTOMER_SORTS = {
  gasto: { value: "spent", label: "Más gasto" },
  compras: { value: "orders", label: "Más compras" },
  reciente: { value: "recent", label: "Más reciente" },
} as const;
export type CustomerSort = keyof typeof CUSTOMER_SORTS;

export const CUSTOMERS_PAGE_SIZE = 30;

export type Customer = {
  email: string;
  name: string;
  phone: string;
  city: string;
  department: string;
  orders: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  spent: number;
  firstOrderAt: string;
  lastOrderAt: string;
  lastOrderId: string;
  lastOrderNumber: number;
};

/** Una página de clientes (agrupados por correo a partir de los pedidos). */
export async function listCustomers({
  q,
  segment,
  sort = "gasto",
  page = 1,
  pageSize = CUSTOMERS_PAGE_SIZE,
}: {
  q?: string;
  segment?: CustomerSegment;
  sort?: CustomerSort;
  page?: number;
  pageSize?: number;
}): Promise<{ customers: Customer[]; total: number; pageCount: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customers", {
    p_query: q ?? undefined,
    p_segment: segment ? CUSTOMER_SEGMENTS[segment].value : undefined,
    p_sort: CUSTOMER_SORTS[sort].value,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw error;
  const total = Number(data[0]?.total_count ?? 0);
  return {
    customers: data.map((row) => ({
      email: row.email,
      name: row.name,
      phone: row.phone,
      city: row.city,
      department: row.department,
      orders: row.orders,
      paidOrders: row.paid_orders,
      pendingOrders: row.pending_orders,
      cancelledOrders: row.cancelled_orders,
      spent: Number(row.spent),
      firstOrderAt: row.first_order_at,
      lastOrderAt: row.last_order_at,
      lastOrderId: row.last_order_id,
      lastOrderNumber: Number(row.last_order_number),
    })),
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Cuántos clientes hay en cada grupo y el gasto promedio de quienes compraron. */
export async function getCustomerSummary() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customer_summary").single();
  if (error) throw error;
  return {
    customers: Number(data.customers),
    buyers: Number(data.buyers),
    frequent: Number(data.frequent),
    new30d: Number(data.new_30d),
    inactive: Number(data.inactive),
    averageSpent: Number(data.average_spent),
  };
}
