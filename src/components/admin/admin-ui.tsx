import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/features/orders/transitions";
import { cn } from "@/lib/utils";

/** Encabezado de cada página del panel: título, descripción y acciones. */
export function AdminPageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: string;
  back?: { href: Route; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="grid gap-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-extrabold font-stretch-112% md:text-3xl">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Contenedor con desplazamiento horizontal para tablas en pantallas pequeñas. */
export function AdminTable({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[44rem] text-left text-sm [&_tbody_tr]:border-t [&_tbody_tr:hover]:bg-secondary/40 [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function AdminTh({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn("text-eyebrow font-mono font-medium text-muted-foreground", className)}
    >
      {children}
    </th>
  );
}

export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

const STATUS_VARIANT: Record<
  OrderStatus,
  "warning" | "soft" | "success" | "destructive" | "outline"
> = {
  pending: "warning",
  confirmed: "soft",
  preparing: "soft",
  shipped: "soft",
  delivered: "success",
  cancelled: "destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

/** Búsqueda por GET: funciona sin JavaScript y deja la URL compartible. */
export function AdminSearch({
  action,
  defaultValue,
  placeholder,
  hidden = {},
}: {
  action: Route;
  defaultValue?: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" role="search" className="relative w-full max-w-sm">
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <label htmlFor="admin-search" className="sr-only">
        {placeholder}
      </label>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        id="admin-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/25 md:text-sm"
      />
    </form>
  );
}

/** Paginación simple (anterior / siguiente) que conserva los demás parámetros. */
export function AdminPagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => Route;
}) {
  if (pageCount <= 1) return null;
  const linkClass =
    "inline-flex h-9 items-center gap-1 rounded-lg border bg-card px-3 text-sm hover:border-input";
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        Página {page} de {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={linkClass} rel="prev">
            <ChevronLeftIcon className="size-4" aria-hidden />
            Anterior
          </Link>
        )}
        {page < pageCount && (
          <Link href={hrefFor(page + 1)} className={linkClass} rel="next">
            Siguiente
            <ChevronRightIcon className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  );
}

/** Lee un parámetro de búsqueda como texto simple. */
export function param(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export function pageParam(value: string | string[] | undefined): number {
  const page = Number(param(value));
  return Number.isInteger(page) && page > 0 && page < 10_000 ? page : 1;
}

export const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});
