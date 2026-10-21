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
  OrderStatusBadge,
  pageParam,
  param,
} from "@/components/admin/admin-ui";
import { listOrders } from "@/features/admin/orders";
import { requireAdmin } from "@/features/auth/session";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/features/orders/transitions";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  Boolean(value && value in ORDER_STATUS_LABELS);

function href(params: { estado?: string; q?: string; pagina?: number }) {
  const search = new URLSearchParams();
  if (params.estado) search.set("estado", params.estado);
  if (params.q) search.set("q", params.q);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return `/admin/pedidos${query ? `?${query}` : ""}` as Route;
}

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  await requireAdmin("/admin/pedidos");
  const params = await searchParams;
  const rawStatus = param(params.estado);
  const status = isStatus(rawStatus) ? rawStatus : undefined;
  const q = param(params.q);
  const page = pageParam(params.pagina);
  const { orders, total, pageCount } = await listOrders({ status, q, page });

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Pedidos"
        description={`${total} ${total === 1 ? "pedido" : "pedidos"}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const active = tab.value === status;
            return (
              <Link
                key={tab.label}
                href={href({ estado: tab.value, q })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary-soft font-semibold text-primary"
                    : "bg-card hover:border-input",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
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
            {orders.map((order) => (
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
                </td>
                <td>
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                </td>
                <td className="text-muted-foreground">
                  {order.city}, {order.department}
                </td>
                <td className="text-right font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(order.total)}
                </td>
                <td>
                  <OrderStatusBadge status={order.status} />
                </td>
              </tr>
            ))}
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
