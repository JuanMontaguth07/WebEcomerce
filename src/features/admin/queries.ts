import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  productsTotal: number;
  productsActive: number;
  outOfStock: number;
  lowStock: number;
  ordersPending: number;
  ordersLast30d: number;
  salesTotal: number;
  salesLast30d: number;
};

/** Indicadores del panel. La función de la base de datos rechaza a no administradores. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error) throw error;

  const stats = data as Record<string, number>;
  const read = (key: string) => Number(stats[key] ?? 0);
  return {
    productsTotal: read("products_total"),
    productsActive: read("products_active"),
    outOfStock: read("out_of_stock"),
    lowStock: read("low_stock"),
    ordersPending: read("orders_pending"),
    ordersLast30d: read("orders_last_30d"),
    salesTotal: read("sales_total"),
    salesLast30d: read("sales_last_30d"),
  };
}
