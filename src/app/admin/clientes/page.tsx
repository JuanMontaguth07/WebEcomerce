import {
  BanknoteIcon,
  DownloadIcon,
  MessageCircleIcon,
  RepeatIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPagination,
  AdminSearch,
  AdminTable,
  AdminTh,
  dateTime,
  FilterChips,
  pageParam,
  param,
} from "@/components/admin/admin-ui";
import { ModuleTile, type TileTone } from "@/components/admin/module-tile";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { customerWhatsapp } from "@/features/admin/order-messages";
import {
  CUSTOMER_SEGMENTS,
  CUSTOMER_SORTS,
  getCustomerSummary,
  listCustomers,
  type CustomerSegment,
  type CustomerSort,
} from "@/features/admin/customers";
import { requireAdmin } from "@/features/auth/session";
import { whatsappLink } from "@/features/store-settings/types";
import { formatCOP } from "@/lib/format";

export const metadata: Metadata = { title: "Clientes" };

const number = new Intl.NumberFormat("es-CO");

const isSegment = (value: string | undefined): value is CustomerSegment =>
  Boolean(value && Object.hasOwn(CUSTOMER_SEGMENTS, value));
const isSort = (value: string | undefined): value is CustomerSort =>
  Boolean(value && Object.hasOwn(CUSTOMER_SORTS, value));

type Params = { q?: string; grupo?: CustomerSegment; orden?: CustomerSort; pagina?: number };

function href(params: Params, base = "/admin/clientes"): Route {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.grupo) search.set("grupo", params.grupo);
  if (params.orden && params.orden !== "gasto") search.set("orden", params.orden);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return `${base}${query ? `?${query}` : ""}` as Route;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Stat({
  label,
  value,
  detail,
  tone,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: TileTone;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="grid content-start gap-1.5 rounded-2xl border bg-card p-5">
      <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        {label}
        <ModuleTile tone={tone} Icon={Icon} className="size-8" />
      </span>
      <span className="font-heading text-2xl font-bold font-stretch-112% tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  await requireAdmin("/admin/clientes");
  const params = await searchParams;
  const q = param(params.q);
  const rawSegment = param(params.grupo);
  const segment = isSegment(rawSegment) ? rawSegment : undefined;
  const rawSort = param(params.orden);
  const sort = isSort(rawSort) ? rawSort : "gasto";
  const page = pageParam(params.pagina);
  const [{ customers, total, pageCount }, summary] = await Promise.all([
    listCustomers({ q, segment, sort, page }),
    getCustomerSummary(),
  ]);
  const counts: Record<CustomerSegment, number> = {
    recurrentes: summary.frequent,
    nuevos: summary.new30d,
    inactivos: summary.inactive,
  };

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Clientes"
        description="Armado a partir de los pedidos: cada correo es un cliente. «Gastado» cuenta solo lo pagado."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/clientes/exportar" prefetch={false}>
              <DownloadIcon aria-hidden />
              Exportar CSV
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Clientes"
          value={number.format(summary.customers)}
          detail={`${number.format(summary.buyers)} ya compraron`}
          tone="violet"
          Icon={UsersIcon}
        />
        <Stat
          label="Recurrentes"
          value={number.format(summary.frequent)}
          detail="Con 2 compras o más"
          tone="green"
          Icon={RepeatIcon}
        />
        <Stat
          label="Nuevos"
          value={number.format(summary.new30d)}
          detail="Primer pedido en los últimos 30 días"
          tone="sky"
          Icon={SparklesIcon}
        />
        <Stat
          label="Gasto promedio"
          value={formatCOP(summary.averageSpent)}
          detail="Por cliente que ya compró"
          tone="amber"
          Icon={BanknoteIcon}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Filtrar por grupo"
          items={[
            {
              key: "todos",
              label: "Todos",
              href: href({ q, orden: sort }),
              active: !segment,
              count: summary.customers,
            },
            ...(Object.keys(CUSTOMER_SEGMENTS) as CustomerSegment[]).map((key) => ({
              key,
              label: CUSTOMER_SEGMENTS[key].label,
              href: href({ q, grupo: key, orden: sort }),
              active: segment === key,
              count: counts[key],
            })),
          ]}
        />
        <AdminSearch
          action="/admin/clientes"
          defaultValue={q}
          placeholder="Nombre, correo o teléfono"
          hidden={{ grupo: segment, orden: sort === "gasto" ? undefined : sort }}
        />
      </div>

      <FilterChips
        label="Ordenar"
        size="sm"
        items={(Object.keys(CUSTOMER_SORTS) as CustomerSort[]).map((key) => ({
          key,
          label: CUSTOMER_SORTS[key].label,
          href: href({ q, grupo: segment, orden: key }),
          active: sort === key,
        }))}
      />

      {customers.length ? (
        <AdminTable caption="Clientes">
          <thead>
            <tr>
              <AdminTh>Cliente</AdminTh>
              <AdminTh>Ciudad</AdminTh>
              <AdminTh>Compras</AdminTh>
              <AdminTh>Gastado</AdminTh>
              <AdminTh>Último pedido</AdminTh>
              <AdminTh>
                <span className="sr-only">Acciones</span>
              </AdminTh>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const phone = customerWhatsapp(customer.phone);
              return (
                <tr key={customer.email}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold"
                      >
                        {initialsOf(customer.name)}
                      </span>
                      <span className="grid min-w-0">
                        <span className="truncate font-semibold">{customer.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {customer.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">
                    {customer.city}
                    <span className="block text-xs">{customer.department}</span>
                  </td>
                  <td>
                    <span className="font-semibold tabular-nums">{customer.paidOrders}</span>
                    <span className="text-muted-foreground"> de {customer.orders}</span>
                    {customer.pendingOrders > 0 && (
                      <span className="block text-xs text-warning">
                        {customer.pendingOrders} por pagar
                      </span>
                    )}
                  </td>
                  <td className="font-semibold tabular-nums">{formatCOP(customer.spent)}</td>
                  <td>
                    <Link
                      href={`/admin/pedidos/${customer.lastOrderId}`}
                      className="font-mono font-semibold text-primary hover:underline"
                    >
                      #{customer.lastOrderNumber}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {dateTime.format(new Date(customer.lastOrderAt))}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/pedidos?q=${encodeURIComponent(customer.email)}`}>
                          Ver pedidos
                        </Link>
                      </Button>
                      {phone && (
                        <Button asChild variant="ghost" size="icon-sm">
                          <a
                            href={whatsappLink(
                              phone,
                              `Hola ${customer.name.split(" ")[0]}, te escribimos de ${siteConfig.name}.`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Escribirle a ${customer.name} por WhatsApp`}
                            title="WhatsApp"
                          >
                            <MessageCircleIcon aria-hidden />
                          </a>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmpty>
          {summary.customers
            ? "Ningún cliente coincide con este filtro."
            : "Cuando lleguen pedidos, aquí verás quién compra, cuánto y cada cuánto."}
        </AdminEmpty>
      )}

      <p className="text-sm text-muted-foreground">
        {number.format(total)} {total === 1 ? "cliente" : "clientes"}
        {q || segment ? " con este filtro" : ""}.
      </p>
      <AdminPagination
        page={page}
        pageCount={pageCount}
        hrefFor={(p) => href({ q, grupo: segment, orden: sort, pagina: p })}
      />
    </div>
  );
}
