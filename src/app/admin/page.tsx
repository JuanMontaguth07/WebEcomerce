import { AlertTriangleIcon, BoxesIcon, ClockIcon, PackageXIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { dateTime, OrderStatusBadge } from "@/components/admin/admin-ui";
import { getLowStockProducts } from "@/features/admin/catalog";
import { getRecentOrders } from "@/features/admin/orders";
import { getDashboardStats } from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resumen" };

function StatCard({
  label,
  value,
  detail,
  Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "destructive";
}) {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            "size-5",
            tone === "warning" && "text-warning",
            tone === "destructive" && "text-destructive",
            tone === "default" && "text-primary",
          )}
        />
      </div>
      <span className="font-heading text-3xl font-bold font-stretch-112% tabular-nums">
        {value}
      </span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

export default async function AdminHomePage() {
  // Defensa en profundidad: la página también exige administrador.
  const admin = await requireAdmin("/admin");
  const [stats, recentOrders, lowStock] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(6),
    getLowStockProducts(8),
  ]);
  const number = new Intl.NumberFormat("es-CO");

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-extrabold font-stretch-112% md:text-3xl">
          Hola{admin.fullName ? `, ${admin.fullName}` : ""}
        </h1>
        <p className="text-muted-foreground">Estado actual de la tienda.</p>
      </div>

      <section aria-labelledby="indicadores" className="grid gap-4">
        <h2 id="indicadores" className="sr-only">
          Indicadores
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Productos registrados"
            value={number.format(stats.productsTotal)}
            detail={`${number.format(stats.productsActive)} visibles en la tienda`}
            Icon={BoxesIcon}
          />
          <StatCard
            label="Agotados"
            value={number.format(stats.outOfStock)}
            detail="Activos sin unidades"
            Icon={PackageXIcon}
            tone={stats.outOfStock > 0 ? "destructive" : "default"}
          />
          <StatCard
            label="Stock bajo"
            value={number.format(stats.lowStock)}
            detail="En o por debajo de su umbral"
            Icon={AlertTriangleIcon}
            tone={stats.lowStock > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Pedidos pendientes"
            value={number.format(stats.ordersPending)}
            detail="Por confirmar"
            Icon={ClockIcon}
          />
          <StatCard
            label="Ventas registradas"
            value={formatCOP(stats.salesTotal)}
            detail={`${formatCOP(stats.salesLast30d)} en los últimos 30 días`}
            Icon={WalletIcon}
          />
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <section
          aria-labelledby="recientes"
          className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="recientes" className="text-lg font-bold">
              Últimos pedidos
            </h2>
            <Link
              href="/admin/pedidos"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          {recentOrders.length ? (
            <ul className="grid divide-y">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="grid gap-0.5">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-mono font-semibold text-primary hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {order.customerName} · {dateTime.format(new Date(order.createdAt))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{formatCOP(order.total)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay pedidos.</p>
          )}
        </section>

        <section
          aria-labelledby="stock-bajo"
          className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="stock-bajo" className="text-lg font-bold">
              Reponer pronto
            </h2>
            <Link
              href="/admin/productos?filtro=low"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          {lowStock.length ? (
            <ul className="flex flex-col gap-2 text-sm">
              {lowStock.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/admin/productos/${product.id}#inventario`}
                    className="min-w-0 truncate hover:text-primary hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span
                    className={cn(
                      "shrink-0 font-mono font-semibold",
                      product.stock === 0 ? "text-destructive" : "text-warning",
                    )}
                  >
                    {product.stock}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todo el inventario está por encima de su umbral.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
