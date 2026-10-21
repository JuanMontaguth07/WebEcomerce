import { AlertTriangleIcon, BoxesIcon, ClockIcon, PackageXIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";
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
  const stats = await getDashboardStats();
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
    </div>
  );
}
