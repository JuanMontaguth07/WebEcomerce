import {
  AlarmClockIcon,
  AlertTriangleIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  PackageCheckIcon,
  PackageXIcon,
  PlusIcon,
  TruckIcon,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { dateTime, OrderStatusBadge } from "@/components/admin/admin-ui";
import { SalesChart } from "@/components/admin/sales-chart";
import { Button } from "@/components/ui/button";
import { listActivity } from "@/features/activity/queries";
import { getLowStockProducts } from "@/features/admin/catalog";
import { getRecentOrders } from "@/features/admin/orders";
import {
  getDashboardStats,
  getSalesSeries,
  getTopProducts,
  type DashboardStats,
} from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";
import { getStoreSettings } from "@/features/store-settings/queries";
import type { StoreSettings } from "@/features/store-settings/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resumen" };

const number = new Intl.NumberFormat("es-CO");
const today = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Bogota",
});

function Panel({
  title,
  link,
  children,
  className,
}: {
  title: string;
  link?: { href: Route; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {link && (
          <Link href={link.href} className="text-sm font-semibold text-primary hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Variación frente a los 30 días anteriores; sin base de comparación no se muestra. */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  const up = change >= 0;
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        up ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : ""}
      {change}% <span className="font-normal text-muted-foreground">vs. 30 días antes</span>
    </span>
  );
}

function StatTile({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5 rounded-xl border bg-card p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl font-bold font-stretch-112% tabular-nums sm:text-3xl">
        {value}
      </span>
      {children}
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

type Task = {
  key: string;
  count: number;
  text: string;
  href: Route;
  Icon: React.ComponentType<{ className?: string }>;
  tone: "destructive" | "warning" | "default";
};

function tasksFor(stats: DashboardStats): Task[] {
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
  const tasks: Task[] = [
    {
      key: "expiring",
      count: stats.ordersExpiringSoon,
      text: plural(
        stats.ordersExpiringSoon,
        "pedido se cancela solo en menos de 12 h si no se confirma",
        "pedidos se cancelan solos en menos de 12 h si no se confirman",
      ),
      href: "/admin/pedidos?estado=pending",
      Icon: AlarmClockIcon,
      tone: "destructive",
    },
    {
      key: "pending",
      count: stats.ordersPending,
      text: plural(stats.ordersPending, "pedido espera el pago", "pedidos esperan el pago"),
      href: "/admin/pedidos?estado=pending",
      Icon: ClockIcon,
      tone: "warning",
    },
    {
      key: "shipping",
      count: stats.ordersShippingUnquoted,
      text: plural(
        stats.ordersShippingUnquoted,
        "pedido tiene el envío por confirmar",
        "pedidos tienen el envío por confirmar",
      ),
      href: "/admin/pedidos?estado=pending",
      Icon: TruckIcon,
      tone: "warning",
    },
    {
      key: "ship",
      count: stats.ordersToShip,
      text: plural(
        stats.ordersToShip,
        "pedido pagado por despachar",
        "pedidos pagados por despachar",
      ),
      href: "/admin/pedidos?estado=confirmed",
      Icon: PackageCheckIcon,
      tone: "default",
    },
    {
      key: "out",
      count: stats.outOfStock,
      text: plural(
        stats.outOfStock,
        "producto visible está agotado",
        "productos visibles están agotados",
      ),
      href: "/admin/productos?filtro=out",
      Icon: PackageXIcon,
      tone: "destructive",
    },
    {
      key: "low",
      count: stats.lowStock,
      text: plural(stats.lowStock, "producto con stock bajo", "productos con stock bajo"),
      href: "/admin/productos?filtro=low",
      Icon: AlertTriangleIcon,
      tone: "warning",
    },
  ];
  return tasks.filter((task) => task.count > 0);
}

function setupSteps(stats: DashboardStats, settings: StoreSettings) {
  return [
    {
      done: Boolean(settings.nequiNumber),
      label: "Configura tu Nequi para recibir pagos",
      href: "/admin/configuracion" as Route,
    },
    {
      done: Boolean(settings.whatsappNumber),
      label: "Agrega el WhatsApp de atención",
      href: "/admin/configuracion" as Route,
    },
    {
      done: Boolean(settings.legalName && settings.legalNit && settings.legalAddress),
      label: "Completa tus datos legales (nombre, NIT, dirección)",
      href: "/admin/configuracion" as Route,
    },
    {
      done: stats.shippingRatesActive > 0,
      label: "Define las tarifas de envío",
      href: "/admin/envios" as Route,
    },
    {
      done: stats.categoriesTotal > 0,
      label: "Crea tu primera categoría",
      href: "/admin/categorias/nueva" as Route,
    },
    {
      done: stats.productsActive > 0,
      label: "Publica tu primer producto",
      href: "/admin/productos/nuevo" as Route,
    },
  ];
}

const TONE = {
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  default: "bg-primary-soft text-primary",
} as const;

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

  const tasks = tasksFor(stats);
  const steps = setupSteps(stats, settings);
  const doneSteps = steps.filter((step) => step.done).length;
  const averageTicket = stats.ordersLast30d ? stats.salesLast30d / stats.ordersLast30d : 0;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {today.format(new Date())}
          </p>
          <h1 className="text-2xl font-extrabold font-stretch-112% md:text-3xl">
            Hola{admin.fullName ? `, ${admin.fullName.split(" ")[0]}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/admin/pedidos?estado=pending">Ver pendientes</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/productos/nuevo">
              <PlusIcon aria-hidden />
              Nuevo producto
            </Link>
          </Button>
        </div>
      </div>

      {doneSteps < steps.length && (
        <section
          aria-labelledby="primeros-pasos"
          className="grid gap-4 rounded-xl border-2 border-primary/30 bg-card p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <h2 id="primeros-pasos" className="text-lg font-bold">
                Deja lista tu tienda
              </h2>
              <p className="text-sm text-muted-foreground">
                {doneSteps} de {steps.length} pasos completos. Este cuadro desaparece al terminar.
              </p>
            </div>
            <div
              role="progressbar"
              aria-label="Avance de la configuración"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneSteps}
              className="h-2 w-40 overflow-hidden rounded-full bg-primary-soft"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(doneSteps / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <li key={step.label}>
                {step.done ? (
                  <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                    <CheckCircle2Icon className="size-4 shrink-0 text-success" aria-hidden />
                    <span className="sr-only">Hecho: </span>
                    {step.label}
                  </span>
                ) : (
                  <Link
                    href={step.href}
                    className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <CircleIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {step.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="atender" className="grid gap-3">
        <h2 id="atender" className="text-lg font-bold">
          Para atender
        </h2>
        {tasks.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <li key={task.key}>
                <Link
                  href={task.href}
                  className="flex h-full items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      TONE[task.tone],
                    )}
                  >
                    <task.Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm">
                    <strong className="block font-heading text-2xl font-bold tabular-nums">
                      {number.format(task.count)}
                    </strong>
                    {task.text}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-5 text-success" aria-hidden />
            Todo al día: no hay pedidos por atender ni productos agotados.
          </p>
        )}
      </section>

      <section aria-labelledby="indicadores" className="grid gap-4">
        <h2 id="indicadores" className="sr-only">
          Indicadores de los últimos 30 días
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Ventas (30 días)" value={formatCOP(stats.salesLast30d)}>
            <Delta current={stats.salesLast30d} previous={stats.salesPrev30d} />
          </StatTile>
          <StatTile label="Pedidos (30 días)" value={number.format(stats.ordersLast30d)}>
            <Delta current={stats.ordersLast30d} previous={stats.ordersPrev30d} />
          </StatTile>
          <StatTile
            label="Ticket promedio"
            value={formatCOP(Math.round(averageTicket))}
            detail="Valor medio por pedido no cancelado"
          />
          <StatTile
            label="Inventario"
            value={formatCOP(stats.inventoryValue)}
            detail={`${number.format(stats.inventoryUnits)} unidades · ${number.format(stats.productsActive)} de ${number.format(stats.productsTotal)} productos visibles`}
          />
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <Panel title="Ventas por día" link={{ href: "/admin/pedidos", label: "Ver pedidos" }}>
          <p className="-mt-2 text-sm text-muted-foreground">
            Últimos 30 días, sin pedidos cancelados · total histórico {formatCOP(stats.salesTotal)}
          </p>
          <SalesChart days={series} />
        </Panel>

        <Panel title="Más vendidos (30 días)">
          {top.length ? (
            <ol className="grid gap-3">
              {top.map((product, index) => (
                <li key={product.productId ?? product.sku} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary font-mono text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="grid min-w-0 flex-1">
                    {product.productId ? (
                      <Link
                        href={`/admin/productos/${product.productId}`}
                        className="truncate text-sm font-semibold hover:text-primary hover:underline"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-semibold">
                        {product.name}{" "}
                        <span className="font-normal text-muted-foreground">(eliminado)</span>
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {number.format(product.units)} {product.units === 1 ? "unidad" : "unidades"}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCOP(product.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cuando vendas, aquí verás los productos que más se mueven.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Panel title="Últimos pedidos" link={{ href: "/admin/pedidos", label: "Ver todos" }}>
          {recentOrders.length ? (
            <ul className="grid divide-y">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
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
                  <div className="grid justify-items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCOP(order.total)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay pedidos.</p>
          )}
        </Panel>

        <Panel title="Actividad reciente" link={{ href: "/admin/actividad", label: "Ver todo" }}>
          {activity.entries.length ? (
            <ActivityFeed
              entries={activity.entries}
              existing={activity.existing}
              names={activity.names}
              compact
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Cada cambio que hagas en el panel quedará registrado aquí.
            </p>
          )}
        </Panel>

        <Panel
          title="Reponer pronto"
          link={{ href: "/admin/productos?filtro=low", label: "Ver todos" }}
        >
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
                    <span className="sr-only"> unidades</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todo el inventario está por encima de su aviso de stock bajo.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
