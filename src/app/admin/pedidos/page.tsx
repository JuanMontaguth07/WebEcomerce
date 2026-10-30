import { DownloadIcon } from "lucide-react";
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
  OrderStatusBadge,
  pageParam,
  param,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { listOrders } from "@/features/admin/orders";
import { getDashboardStats } from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/features/orders/transitions";
import { formatCOP } from "@/lib/format";

export const metadata: Metadata = { title: "Pedidos" };

const TABS: { value?: OrderStatus; label: string }[] = [
  { label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "preparing", label: "En preparación" },
  { value: "shipped", label: "Enviados" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

const isStatus = (value: string | undefined): value is OrderStatus =>
  Boolean(value && Object.hasOwn(ORDER_STATUS_LABELS, value));

function href(params: { estado?: string; q?: string; pagina?: number }, base = "/admin/pedidos") {
  const search = new URLSearchParams();
  if (params.estado) search.set("estado", params.estado);
  if (params.q) search.set("q", params.q);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return `${base}${query ? `?${query}` : ""}` as Route;
}

/** «vence en 5 h» o «vence en 40 min» para pedidos pendientes. */
function expiresIn(minutes: number) {
  if (minutes < 60) return { text: `vence en ${minutes} min`, urgent: true };
  const hours = Math.round(minutes / 60);
  return { text: `vence en ${hours} h`, urgent: hours <= 12 };
}

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  await requireAdmin("/admin/pedidos");
  const params = await searchParams;
  const rawStatus = param(params.estado);
  const status = isStatus(rawStatus) ? rawStatus : undefined;
  const q = param(params.q);
  const page = pageParam(params.pagina);
  const [{ orders, total, pageCount }, stats] = await Promise.all([
    listOrders({ status, q, page }),
    getDashboardStats(),
  ]);
  const counts = stats.ordersByStatus;
  const allCount = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Pedidos"
        description={`${total} ${total === 1 ? "pedido" : "pedidos"}${q ? " con esta búsqueda" : ""}`}
        actions={
          <Button asChild variant="secondary">
            <Link href={href({ estado: status, q }, "/admin/pedidos/exportar")} prefetch={false}>
              <DownloadIcon aria-hidden />
              Exportar CSV
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Filtrar por estado"
          items={TABS.map((tab) => ({
            key: tab.label,
            label: tab.label,
            href: href({ estado: tab.value, q }),
            active: tab.value === status,
            count: tab.value ? (counts[tab.value] ?? 0) : allCount,
          }))}
        />
        <AdminSearch
          action="/admin/pedidos"
          defaultValue={q}
          placeholder="Número, cliente o correo"
          hidden={{ estado: status }}
        />
      </div>

      {orders.length ? (
        <AdminTable caption="Pedidos">
          <thead>
            <tr>
              <AdminTh>Pedido</AdminTh>
              <AdminTh>Fecha</AdminTh>
              <AdminTh>Cliente</AdminTh>
              <AdminTh>Destino</AdminTh>
              <AdminTh className="text-right">Total</AdminTh>
              <AdminTh>Estado</AdminTh>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const expiry =
                order.status === "pending" && order.expiresInMinutes !== null
                  ? expiresIn(order.expiresInMinutes)
                  : null;
              const open = !["shipped", "delivered", "cancelled"].includes(order.status);
              return (
                <tr key={order.id}>
                  <td>
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-mono font-semibold text-primary hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {order.itemCount} {order.itemCount === 1 ? "producto" : "productos"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {dateTime.format(new Date(order.createdAt))}
                    {expiry && (
                      <div
                        className={
                          expiry.urgent
                            ? "text-xs font-semibold text-destructive"
                            : "text-xs text-warning"
                        }
                      >
                        Reserva {expiry.text}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                  </td>
                  <td className="text-muted-foreground">
                    {order.city}, {order.department}
                  </td>
                  <td className="text-right whitespace-nowrap tabular-nums">
                    <span className="font-semibold">{formatCOP(order.total)}</span>
                    {order.shippingCost === null && open && (
                      <div className="text-xs text-warning">+ envío por confirmar</div>
                    )}
                  </td>
                  <td>
                    <div className="grid justify-items-start gap-1">
                      <OrderStatusBadge status={order.status} />
                      {order.receiptPending && (
                        <Link
                          href={`/admin/pedidos/${order.id}#comprobante`}
                          className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success hover:underline"
                        >
                          Comprobante por revisar
                        </Link>
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
          {q || status ? "Ningún pedido coincide con el filtro." : "Aún no hay pedidos."}
        </AdminEmpty>
      )}

      <AdminPagination
        page={page}
        pageCount={pageCount}
        hrefFor={(p) => href({ estado: status, q, pagina: p })}
      />
    </div>
  );
}
