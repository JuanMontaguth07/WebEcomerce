import "server-only";
import type { OrderStatus } from "@/features/orders/transitions";
import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  productsTotal: number;
  productsActive: number;
  outOfStock: number;
  lowStock: number;
  inventoryUnits: number;
  inventoryValue: number;
  ordersPending: number;
  ordersToShip: number;
  ordersShippingUnquoted: number;
  ordersExpiringSoon: number;
  ordersLast30d: number;
  ordersPrev30d: number;
  salesTotal: number;
  salesLast30d: number;
  salesPrev30d: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  categoriesTotal: number;
  shippingRatesActive: number;
};

/** Indicadores del panel. La función de la base de datos rechaza a no administradores. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error) throw error;

  const stats = data as Record<string, unknown>;
  const read = (key: string) => Number(stats[key] ?? 0);
  const byStatus = (stats.orders_by_status ?? {}) as Record<string, unknown>;
  return {
    productsTotal: read("products_total"),
    productsActive: read("products_active"),
    outOfStock: read("out_of_stock"),
    lowStock: read("low_stock"),
    inventoryUnits: read("inventory_units"),
    inventoryValue: read("inventory_value"),
    ordersPending: read("orders_pending"),
    ordersToShip: read("orders_to_ship"),
    ordersShippingUnquoted: read("orders_shipping_unquoted"),
    ordersExpiringSoon: read("orders_expiring_soon"),
    ordersLast30d: read("orders_last_30d"),
    ordersPrev30d: read("orders_prev_30d"),
    salesTotal: read("sales_total"),
    salesLast30d: read("sales_last_30d"),
    salesPrev30d: read("sales_prev_30d"),
    ordersByStatus: Object.fromEntries(
      Object.entries(byStatus).map(([status, count]) => [status, Number(count)]),
    ),
    categoriesTotal: read("categories_total"),
    shippingRatesActive: read("shipping_rates_active"),
  };
}

export type SalesDay = { day: string; orders: number; revenue: number };

/** Ventas por día de los últimos `days` días (hora de Colombia). */
export async function getSalesSeries(days = 30): Promise<SalesDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_sales_series", { p_days: days });
  if (error) throw error;
  return data.map((row) => ({
    day: row.day,
    orders: Number(row.orders),
    revenue: Number(row.revenue),
  }));
}

export type TopProduct = {
  productId: string | null;
  name: string;
  sku: string;
  units: number;
  revenue: number;
};

/** Productos más vendidos del periodo; los eliminados aparecen con su nombre guardado. */
export async function getTopProducts(days = 30, limit = 5): Promise<TopProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_top_products", {
    p_days: days,
    p_limit: limit,
  });
  if (error) throw error;
  return data.map((row) => ({
    productId: row.product_id,
    name: row.product_name,
    sku: row.sku,
    units: Number(row.units),
    revenue: Number(row.revenue),
  }));
}
