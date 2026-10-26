import { MailIcon, MessageCircleIcon, PhoneIcon, SendIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { AdminPageHeader, dateTime, OrderStatusBadge } from "@/components/admin/admin-ui";
import { CopyButton } from "@/components/support/copy-button";
import { listActivity } from "@/features/activity/queries";
import { customerMessages, customerWhatsapp } from "@/features/admin/order-messages";
import { getAdminOrder } from "@/features/admin/orders";
import { requireAdmin } from "@/features/auth/session";
import { ORDER_STATUS_LABELS } from "@/features/orders/transitions";
import { getShippingQuote } from "@/features/shipping/queries";
import { getStoreSettings } from "@/features/store-settings/queries";
import { whatsappLink } from "@/features/store-settings/types";
import { formatCOP } from "@/lib/format";
import { OrderStatusActions } from "./order-status-actions";
import { ShippingEditor } from "./shipping-editor";

export const metadata: Metadata = { title: "Pedido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHIPPING_EDITABLE = new Set(["pending", "confirmed", "preparing"]);

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="grid min-w-0 content-start gap-4 rounded-xl border bg-card p-5"
    >
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

  const editableShipping = SHIPPING_EDITABLE.has(order.status);
  const [activity, settings, quote] = await Promise.all([
    listActivity({ entityId: order.id, limit: 50 }),
    getStoreSettings(),
    editableShipping ? getShippingQuote(order.department, order.city) : Promise.resolve(null),
  ]);
  // Pedidos anteriores al historial general no tienen su creación registrada allí.
  const hasFullActivity = activity.entries.some((entry) => entry.action === "create");

  const subtotal = Number(order.subtotal);
  const shippingCost = order.shipping_cost === null ? null : Number(order.shipping_cost);
  const total = Number(order.total);
  const phone = customerWhatsapp(order.customer_phone);
  const messages = customerMessages(
    {
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customer_name,
      city: order.city,
      subtotal,
      shippingCost,
      total,
    },
    settings,
  );
  const fullAddress = `${order.address}, ${order.city}, ${order.department}`;

  const contactLink =
    "inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:border-input";

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title={`Pedido #${order.orderNumber}`}
        description={`Recibido el ${dateTime.format(new Date(order.created_at))} · ${order.customer_name}`}
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="grid min-w-0 gap-6">
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
                      <span className="font-semibold">
                        {item.product_name}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          (producto eliminado)
                        </span>
                      </span>
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
                <dd className="tabular-nums">{formatCOP(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Envío</dt>
                <dd className={shippingCost === null ? "font-semibold text-warning" : undefined}>
                  {shippingCost === null ? "Por confirmar" : formatCOP(shippingCost)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCOP(total)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Historial">
            {hasFullActivity ? (
              <ActivityFeed
                entries={activity.entries}
                existing={activity.existing}
                names={activity.names}
              />
            ) : (
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
            )}
          </Section>
        </div>

        <div className="grid min-w-0 gap-6">
          <Section title="Gestionar pedido">
            {order.status === "pending" && order.expires_at && (
              <p className="text-sm text-warning">
                La reserva de stock vence el {dateTime.format(new Date(order.expires_at))}.
                Confírmalo cuando recibas el pago para mantener las unidades apartadas.
              </p>
            )}
            <OrderStatusActions orderId={order.id} status={order.status} />
          </Section>

          {editableShipping && (
            <Section title="Envío" id="envio">
              {shippingCost === null && (
                <p className="text-sm text-muted-foreground">
                  No había tarifa para {order.city}. Fija el valor: el cliente verá el total
                  actualizado en la página de su pedido antes de pagar.
                </p>
              )}
              <ShippingEditor
                orderId={order.id}
                subtotal={subtotal}
                shippingCost={shippingCost}
                suggested={quote?.price ?? null}
              />
            </Section>
          )}

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
                href={whatsappLink(phone)}
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
            {messages.length > 0 && (
              <div className="grid gap-2 border-t pt-4">
                <h3 className="text-sm font-semibold">Mensajes rápidos por WhatsApp</h3>
                <ul className="grid gap-2">
                  {messages.map((message) => (
                    <li key={message.key}>
                      <a
                        href={whatsappLink(phone, message.text)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group grid gap-1 rounded-lg border bg-background p-3 text-sm transition-colors hover:border-primary/50"
                      >
                        <span className="flex items-center gap-2 font-semibold group-hover:text-primary">
                          <SendIcon className="size-3.5" aria-hidden />
                          {message.label}
                        </span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {message.text}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
            <div className="flex flex-wrap gap-2">
              <CopyButton
                value={`${order.customer_name}\n${order.customer_phone}\n${fullAddress}`}
                label="Copiar datos de envío"
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={contactLink}
              >
                Ver en el mapa
              </a>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
