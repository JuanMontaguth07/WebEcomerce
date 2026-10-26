import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/config/site";
import { getPendingOrderCount } from "@/features/admin/orders";
import { requireAdmin } from "@/features/auth/session";

// «Admin ·» al inicio del título y el ícono naranja (admin/icon.svg) distinguen la
// pestaña del panel de la tienda.
export const metadata: Metadata = {
  title: { default: `Admin · ${siteConfig.name}`, template: `Admin · %s | ${siteConfig.name}` },
  robots: { index: false, follow: false },
};

/** Verifica en el servidor que el usuario sea administrador antes de mostrar el panel. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const pendingOrders = await getPendingOrderCount();
  return (
    <AdminShell admin={admin} pendingOrders={pendingOrders}>
      {children}
    </AdminShell>
  );
}

function AdminSkeleton() {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[15rem_1fr]" aria-busy>
      <span className="sr-only">Cargando panel…</span>
      <div className="hidden border-r bg-sidebar p-4 lg:block">
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="grid content-start gap-6 p-8">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
