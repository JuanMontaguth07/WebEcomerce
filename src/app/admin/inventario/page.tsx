import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  AdminTh,
  dateTime,
  pageParam,
  param,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/session";
import { getInventoryMovements, type MovementType } from "@/features/inventory/queries";
import { MOVEMENT_LABELS } from "@/features/inventory/schemas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventario" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = Object.keys(MOVEMENT_LABELS) as MovementType[];

function href(params: { tipo?: string; producto?: string; pagina?: number }) {
  const search = new URLSearchParams();
  if (params.tipo) search.set("tipo", params.tipo);
  if (params.producto) search.set("producto", params.producto);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return `/admin/inventario${query ? `?${query}` : ""}` as Route;
}

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventario">) {
  await requireAdmin("/admin/inventario");
  const params = await searchParams;
  const rawType = param(params.tipo);
  const type = TYPES.includes(rawType as MovementType) ? (rawType as MovementType) : undefined;
  const rawProduct = param(params.producto);
  const productId = rawProduct && UUID.test(rawProduct) ? rawProduct : undefined;
  const page = pageParam(params.pagina);
  const { movements, total, pageCount } = await getInventoryMovements({ productId, type, page });
  const productName = productId ? movements[0]?.product?.name : undefined;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Inventario"
        description={
          productId
            ? `Movimientos de ${productName ?? "este producto"} · ${total} registros`
            : `Cada cambio de stock queda registrado · ${total} movimientos`
        }
        back={
          productId
            ? { href: `/admin/productos/${productId}` as Route, label: "Volver al producto" }
            : undefined
        }
      />

      <nav aria-label="Filtrar por tipo" className="flex flex-wrap gap-1">
        {[undefined, ...TYPES].map((value) => (
          <Link
            key={value ?? "all"}
            href={href({ tipo: value, producto: productId })}
            aria-current={value === type ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              value === type
                ? "border-primary bg-primary-soft font-semibold text-primary"
                : "bg-card hover:border-input",
            )}
          >
            {value ? MOVEMENT_LABELS[value] : "Todos"}
          </Link>
        ))}
      </nav>

      {movements.length ? (
        <AdminTable caption="Movimientos de inventario">
          <thead>
            <tr>
              <AdminTh>Fecha</AdminTh>
              <AdminTh>Producto</AdminTh>
              <AdminTh>Tipo</AdminTh>
              <AdminTh className="text-right">Cantidad</AdminTh>
              <AdminTh className="text-right">Stock</AdminTh>
              <AdminTh>Detalle</AdminTh>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td className="whitespace-nowrap text-muted-foreground">
                  {dateTime.format(new Date(movement.createdAt))}
                </td>
                <td>
                  {movement.product ? (
                    <Link
                      href={`/admin/productos/${movement.product.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {movement.product.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                  <div className="font-mono text-xs text-muted-foreground">
                    {movement.product?.sku}
                  </div>
                </td>
                <td>{MOVEMENT_LABELS[movement.type]}</td>
                <td
                  className={cn(
                    "text-right font-mono font-semibold",
                    movement.quantity > 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {movement.quantity > 0 ? "+" : ""}
                  {movement.quantity}
                </td>
                <td className="text-right font-mono whitespace-nowrap text-muted-foreground tabular-nums">
                  {movement.previousStock} →{" "}
                  <span className="text-foreground">{movement.resultingStock}</span>
                </td>
                <td className="text-muted-foreground">
                  {movement.orderId && (
                    <Link
                      href={`/admin/pedidos/${movement.orderId}`}
                      className="text-primary hover:underline"
                    >
                      Ver pedido
                    </Link>
                  )}
                  {movement.reason && <div className="text-xs">{movement.reason}</div>}
                  <div className="text-xs">
                    {movement.author ?? (movement.orderId ? "Cliente / sistema" : "Sistema")}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmpty>No hay movimientos con este filtro.</AdminEmpty>
      )}

      <AdminPagination
        page={page}
        pageCount={pageCount}
        hrefFor={(p) => href({ tipo: type, producto: productId, pagina: p })}
      />
    </div>
  );
}
