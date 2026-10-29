import type { Metadata } from "next";
import { DashboardView } from "@/components/admin/dashboard-view";
import { siteConfig } from "@/config/site";
import { listActivity } from "@/features/activity/queries";
import { getLowStockProducts } from "@/features/admin/catalog";
import { getRecentOrders } from "@/features/admin/orders";
import { getDashboardStats, getSalesSeries, getTopProducts } from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";
import { getStoreSettings } from "@/features/store-settings/queries";

// La plantilla del layout no aplica a la página de su mismo segmento: se escribe completo.
export const metadata: Metadata = { title: { absolute: `Admin · Resumen | ${siteConfig.name}` } };

export default async function AdminHomePage() {
  // Defensa en profundidad: la página también exige administrador.
  const admin = await requireAdmin("/admin");
  const [stats, series, top, recentOrders, lowStock, activity, settings] = await Promise.all([
    getDashboardStats(),
    getSalesSeries(30),
    getTopProducts(30, 5),
    getRecentOrders(6),
    getLowStockProducts(6),
    listActivity({ limit: 8 }),
    getStoreSettings(),
  ]);

  return (
    <DashboardView
      firstName={admin.fullName?.split(" ")[0]}
      {...{ stats, series, top, recentOrders, lowStock, activity, settings }}
    />
  );
}
