import {
  AlarmClockIcon,
  AlertTriangleIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  CircleIcon,
  ClipboardListIcon,
  ClockIcon,
  ExternalLinkIcon,
  HistoryIcon,
  MegaphoneIcon,
  PackageCheckIcon,
  PackagePlusIcon,
  PackageXIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TrophyIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ActivityFeed } from "./activity-feed";
import { dateTime, OrderStatusBadge } from "./admin-ui";
import { CountUp } from "./count-up";
import { ModuleTile, type TileTone } from "./module-tile";
import { SalesChart } from "./sales-chart";
import type { listActivity } from "@/features/activity/queries";
import type { getLowStockProducts } from "@/features/admin/catalog";
import type { getRecentOrders } from "@/features/admin/orders";
import type { DashboardStats, SalesDay, TopProduct } from "@/features/admin/queries";
import type { StoreSettings } from "@/features/store-settings/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

const number = new Intl.NumberFormat("es-CO");
const today = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Bogota",
});
const hourInBogota = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "America/Bogota",
});

/** «Buenos días» hasta el mediodía, «Buenas tardes» hasta las 7 p. m. y luego «Buenas noches». */
function greeting(date: Date): string {
  const hour = Number(hourInBogota.format(date));
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

type Lucide = React.ComponentType<{ className?: string; strokeWidth?: number }>;

/** Los bloques del resumen suben uno tras otro (globals.css: .admin-rise). */
const rise = (index: number) => ({
  className: "admin-rise",
  style: { "--i": index } as React.CSSProperties,
});

/** Línea de tendencia mínima de una serie (sin ejes: el número grande da la cifra). */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 0);
  if (values.length < 2 || max <= 0) return null;
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * 100,
    28 - (value / max) * 26,
  ]);
  const line = points.map(([x, y]) => `${x!.toFixed(2)},${y!.toFixed(2)}`).join(" ");
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("h-9 w-full overflow-visible", className)}
    >
      <polygon points={`0,30 ${line} 100,30`} className="fill-current opacity-15" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Panel({
  title,
  tone,
  Icon,
  link,
  children,
  className,
  style,
}: {
  title: string;
  tone: TileTone;
  Icon: Lucide;
  link?: { href: Route; label: string };
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      aria-label={title}
      style={style}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-[0_18px_40px_-28px_rgb(0_0_0/0.45)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-bold">
          <ModuleTile tone={tone} Icon={Icon} />
          {title}
        </h2>
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
  format,
  tone,
  Icon,
  trend,
  trendClass,
  detail,
  children,
  index,
}: {
  label: string;
  value: number;
  format: "cop" | "number";
  tone: TileTone;
  Icon: Lucide;
  trend?: number[];
  trendClass?: string;
  detail?: string;
  children?: React.ReactNode;
  index: number;
}) {
  const { className, style } = rise(index);
  return (
    <div
      style={style}
      className={cn(
        "relative grid content-start gap-1.5 overflow-hidden rounded-2xl border bg-card p-5 transition-[translate,box-shadow] duration-300 ease-out-soft hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgb(0_0_0/0.5)]",
        className,
      )}
    >
      <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        {label}
        <ModuleTile tone={tone} Icon={Icon} className="size-8" />
      </span>
      <span className="font-heading text-2xl font-bold font-stretch-112% tabular-nums sm:text-3xl">
        <CountUp value={value} format={format} />
      </span>
      {children}
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      {trend && <Sparkline values={trend} className={cn("-mx-1 mt-1", trendClass)} />}
    </div>
  );
}

type Task = {
  key: string;
  count: number;
  text: string;
  href: Route;
  Icon: Lucide;
  tone: TileTone;
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
      tone: "red",
    },
    {
      key: "pending",
      count: stats.ordersPending,
      text: plural(stats.ordersPending, "pedido espera el pago", "pedidos esperan el pago"),
      href: "/admin/pedidos?estado=pending",
      Icon: ClockIcon,
      tone: "amber",
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
      tone: "sky",
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
      tone: "green",
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
      tone: "red",
    },
    {
      key: "low",
      count: stats.lowStock,
      text: plural(stats.lowStock, "producto con stock bajo", "productos con stock bajo"),
      href: "/admin/productos?filtro=low",
      Icon: AlertTriangleIcon,
      tone: "amber",
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

/** Accesos rápidos del saludo, con el color de su módulo. */
const QUICK_ACTIONS: {
  href: Route;
  label: string;
  tone: TileTone;
  Icon: Lucide;
  external?: boolean;
}[] = [
  { href: "/admin/productos/nuevo", label: "Nuevo producto", tone: "blue", Icon: PackagePlusIcon },
  {
    href: "/admin/pedidos?estado=pending",
    label: "Pendientes",
    tone: "green",
    Icon: ClipboardListIcon,
  },
  { href: "/admin/inventario", label: "Inventario", tone: "amber", Icon: WarehouseIcon },
  { href: "/admin/portada", label: "Portada", tone: "red", Icon: MegaphoneIcon },
  { href: "/", label: "Ver tienda", tone: "slate", Icon: ExternalLinkIcon, external: true },
];

type RecentOrder = Awaited<ReturnType<typeof getRecentOrders>>[number];
type LowStockProduct = Awaited<ReturnType<typeof getLowStockProducts>>[number];
type Activity = Awaited<ReturnType<typeof listActivity>>;

export type DashboardData = {
  firstName: string | undefined;
  stats: DashboardStats;
  series: SalesDay[];
  top: TopProduct[];
  recentOrders: RecentOrder[];
  lowStock: LowStockProduct[];
  activity: Activity;
  settings: StoreSettings;
};

/** Resumen del panel: saludo, lo que hay por atender, cifras y lo reciente. */
export function DashboardView({
  firstName,
  stats,
  series,
  top,
  recentOrders,
  lowStock,
  activity,
  settings,
}: DashboardData) {
  const tasks = tasksFor(stats);
  const steps = setupSteps(stats, settings);
  const doneSteps = steps.filter((step) => step.done).length;
  const averageTicket = stats.ordersLast30d ? stats.salesLast30d / stats.ordersLast30d : 0;

  const now = new Date();
  // Cuántos temas hay por atender (un pedido puede contar en dos: pendiente y por vencer).
  const attention = tasks.length;
  const urgent = tasks.some((task) => task.tone === "red");

  return (
    <div className="grid gap-6">
      <section
        aria-labelledby="saludo"
        {...rise(0)}
        className="admin-rise relative isolate overflow-hidden rounded-3xl border bg-card p-6 md:p-8"
      >
        {/* Luces suaves con los colores del panel: decoración, sin información. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40rem_16rem_at_0%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_70%),radial-gradient(24rem_14rem_at_100%_0%,#60a5fa1f,transparent_70%),radial-gradient(22rem_12rem_at_70%_120%,#4ade801a,transparent_70%)]"
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="grid gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <SparklesIcon className="size-4 text-primary" aria-hidden />
              <span className="inline-block first-letter:uppercase">{today.format(now)}</span>
            </p>
            <h1
              id="saludo"
              className="text-3xl font-extrabold text-balance font-stretch-112% md:text-4xl"
            >
              {greeting(now)}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="max-w-prose text-muted-foreground">
              {attention
                ? `Tienes ${number.format(attention)} ${attention === 1 ? "tema" : "temas"} por atender.${urgent ? " Empieza por lo que está en rojo." : ""}`
                : "Todo está al día. Buen momento para revisar el catálogo o preparar la portada."}
            </p>
          </div>
          <nav aria-label="Accesos rápidos" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                className="group/quick grid justify-items-center gap-2 rounded-2xl border bg-background/70 px-3 py-3 text-center text-xs font-medium backdrop-blur transition-[translate,border-color,box-shadow] duration-300 ease-out-soft hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_14px_30px_-20px_rgb(0_0_0/0.6)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="relative">
                  <ModuleTile
                    tone={action.tone}
                    Icon={action.Icon}
                    className="size-10 rounded-xl transition-[scale] duration-300 group-hover/quick:scale-110"
                  />
                  {action.label === "Pendientes" && stats.ordersPending > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[linear-gradient(145deg,#fb7185,#e11d48)] px-1 text-[0.6875rem] font-bold text-white tabular-nums ring-2 ring-card">
                      {stats.ordersPending}
                    </span>
                  )}
                </span>
                {action.label}
                {action.external && <span className="sr-only">(se abre en otra pestaña)</span>}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {doneSteps < steps.length && (
        <section
          aria-labelledby="primeros-pasos"
          {...rise(1)}
          className="admin-rise grid gap-4 rounded-2xl border-2 border-primary/30 bg-card p-5"
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

      <section aria-labelledby="atender" {...rise(2)} className="admin-rise grid gap-3">
        <h2 id="atender" className="text-lg font-bold">
          Para atender
        </h2>
        {tasks.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <li key={task.key}>
                <Link
                  href={task.href}
                  className="group/task flex h-full items-center gap-4 rounded-2xl border bg-card p-4 transition-[translate,border-color,box-shadow] duration-300 ease-out-soft hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_16px_34px_-24px_rgb(0_0_0/0.55)]"
                >
                  <ModuleTile
                    tone={task.tone}
                    Icon={task.Icon}
                    className="size-11 rounded-xl transition-[scale] duration-300 group-hover/task:scale-110"
                  />
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
          <p className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
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
          <StatTile
            index={3}
            label="Ventas (30 días)"
            value={stats.salesLast30d}
            format="cop"
            tone="green"
            Icon={BanknoteIcon}
            trend={series.map((day) => day.revenue)}
            trendClass="text-success"
          >
            <Delta current={stats.salesLast30d} previous={stats.salesPrev30d} />
          </StatTile>
          <StatTile
            index={4}
            label="Pedidos (30 días)"
            value={stats.ordersLast30d}
            format="number"
            tone="blue"
            Icon={ShoppingBagIcon}
            trend={series.map((day) => day.orders)}
            trendClass="text-primary"
          >
            <Delta current={stats.ordersLast30d} previous={stats.ordersPrev30d} />
          </StatTile>
          <StatTile
            index={5}
            label="Ticket promedio"
            value={Math.round(averageTicket)}
            format="cop"
            tone="violet"
            Icon={ReceiptIcon}
            detail="Valor medio por pedido no cancelado"
          />
          <StatTile
            index={6}
            label="Inventario"
            value={stats.inventoryValue}
            format="cop"
            tone="amber"
            Icon={WarehouseIcon}
            detail={`${number.format(stats.inventoryUnits)} unidades · ${number.format(stats.productsActive)} de ${number.format(stats.productsTotal)} productos visibles`}
          />
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <Panel
          title="Ventas por día"
          tone="green"
          Icon={BarChart3Icon}
          link={{ href: "/admin/pedidos", label: "Ver pedidos" }}
          {...rise(7)}
        >
          <p className="-mt-2 text-sm text-muted-foreground">
            Últimos 30 días, sin pedidos cancelados · total histórico {formatCOP(stats.salesTotal)}
          </p>
          <SalesChart days={series} />
        </Panel>

        <Panel title="Más vendidos (30 días)" tone="orange" Icon={TrophyIcon} {...rise(8)}>
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
        <Panel
          title="Últimos pedidos"
          tone="green"
          Icon={ClipboardListIcon}
          link={{ href: "/admin/pedidos", label: "Ver todos" }}
          {...rise(9)}
        >
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

        <Panel
          title="Actividad reciente"
          tone="cyan"
          Icon={HistoryIcon}
          link={{ href: "/admin/actividad", label: "Ver todo" }}
          {...rise(10)}
        >
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
          tone="amber"
          Icon={PackageXIcon}
          link={{ href: "/admin/productos?filtro=low", label: "Ver todos" }}
          {...rise(11)}
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
