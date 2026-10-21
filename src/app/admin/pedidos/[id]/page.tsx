import { MailIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, dateTime, OrderStatusBadge } from "@/components/admin/admin-ui";
import { getAdminOrder } from "@/features/admin/orders";
import { requireAdmin } from "@/features/auth/session";
import { ORDER_STATUS_LABELS } from "@/features/orders/transitions";
import { formatCOP } from "@/lib/format";
import { OrderStatusActions } from "./order-status-actions";

export const metadata: Metadata = { title: "Pedido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Número para WhatsApp: celulares colombianos de 10 dígitos llevan el indicativo 57. */
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-4 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/pedidos/${id}`);
  if (!UUID.test(id)) notFound();
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const contactLink =
    "inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:border-input";

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title={`Pedido #${order.orderNumber}`}
        description={`Recibido el ${dateTime.format(new Date(order.created_at))}`}
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="grid gap-6">
          <Section title="Productos">
            <ul className="grid divide-y">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3 first:pt-0">
                  <div className="grid min-w-0 gap-0.5">
                    {item.product_id ? (
                      <Link
                        href={`/admin/productos/${item.product_id}`}
                        className="font-semibold hover:text-primary hover:underline"
                      >
                        {item.product_name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{item.product_name}</span>
                    )}
                    <span className="font-mono text-xs text-muted-foreground">
                      SKU {item.sku} · {item.quantity} × {formatCOP(Number(item.unit_price))}
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatCOP(Number(item.subtotal))}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="grid gap-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatCOP(Number(order.subtotal))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Envío</dt>
                <dd>
                  {order.shipping_cost === null
                    ? "Por confirmar"
                    : formatCOP(Number(order.shipping_cost))}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCOP(Number(order.total))}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Historial">
            <ol className="grid gap-3">
              {order.history.map((entry) => (
                <li
                  key={entry.id}
                  className="grid gap-0.5 border-l-2 border-primary/40 pl-4 text-sm"
                >
                  <span className="font-semibold">
                    {entry.from_status ? `${ORDER_STATUS_LABELS[entry.from_status]} → ` : ""}
                    {ORDER_STATUS_LABELS[entry.to_status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateTime.format(new Date(entry.created_at))}
                    {entry.author
                      ? ` · ${entry.author.full_name ?? entry.author.email}`
                      : entry.from_status
                        ? " · Automático"
                        : " · Cliente"}
                  </span>
                  {entry.note && <span className="text-muted-foreground">{entry.note}</span>}
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="grid gap-6">
          <Section title="Gestionar pedido">
            {order.status === "pending" && order.expires_at && (
              <p className="text-sm text-warning">
                La reserva de stock vence el {dateTime.format(new Date(order.expires_at))}.
                Confírmalo antes para mantener las unidades apartadas.
              </p>
            )}
            <OrderStatusActions orderId={order.id} status={order.status} />
          </Section>

          <Section title="Cliente">
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{order.customer_name}</dd>
              </div>
              {order.customer_document && (
                <div>
                  <dt className="text-muted-foreground">Cédula / NIT</dt>
                  <dd className="font-mono">{order.customer_document}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Correo</dt>
                <dd className="break-all select-all">{order.customer_email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd className="font-mono select-all">{order.customer_phone}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${whatsappNumber(order.customer_phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={contactLink}
              >
                <MessageCircleIcon className="size-4 text-success" aria-hidden />
                WhatsApp
              </a>
              <a href={`tel:${order.customer_phone}`} className={contactLink}>
                <PhoneIcon className="size-4" aria-hidden />
                Llamar
              </a>
              <a
                href={`mailto:${order.customer_email}?subject=${encodeURIComponent(`Pedido #${order.orderNumber}`)}`}
                className={contactLink}
              >
                <MailIcon className="size-4" aria-hidden />
                Correo
              </a>
            </div>
          </Section>

          <Section title="Entrega">
            <address className="grid gap-1 text-sm not-italic">
              <span>{order.address}</span>
              <span>
                {order.city}, {order.department}
              </span>
              {order.notes && (
                <span className="mt-2 text-muted-foreground">Indicaciones: {order.notes}</span>
              )}
            </address>
          </Section>
        </div>
      </div>
    </div>
  );
}
