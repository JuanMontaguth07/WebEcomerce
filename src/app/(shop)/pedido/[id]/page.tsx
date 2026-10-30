import { CheckCircle2Icon, CircleDotIcon, MessageCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PaymentInstructions } from "@/components/support/payment-instructions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrderByToken, ORDER_STATUS_LABELS } from "@/features/orders/queries";
import { getStoreSettings } from "@/features/store-settings/queries";
import { whatsappLink } from "@/features/store-settings/types";
import { formatCOP } from "@/lib/format";

// Información personal: nunca se indexa ni se comparte la URL con terceros.
export const metadata: Metadata = {
  title: "Tu pedido",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

async function OrderContent({ params, searchParams }: PageProps<"/pedido/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const token = Array.isArray(query.t) ? query.t[0] : query.t;
  const [order, settings] = await Promise.all([
    token ? getOrderByToken(id, token) : null,
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const isNew = order.status === "pending";

  return (
    <div className="grid gap-8">
      <div className="grid justify-items-start gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
          {isNew ? (
            <CheckCircle2Icon className="size-4" aria-hidden />
          ) : (
            <CircleDotIcon className="size-4" aria-hidden />
          )}
          {ORDER_STATUS_LABELS[order.status]}
        </span>
        <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">
          {isNew ? "¡Recibimos tu pedido!" : "Estado de tu pedido"}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Pedido <strong className="font-mono text-foreground">#{order.orderNumber}</strong> ·{" "}
          {/* La hora en es-CO ya termina en "a. m." / "p. m.": no se agrega otro punto. */}
          {dateFormatter.format(new Date(order.createdAt))}{" "}
          {isNew &&
            (settings.nequiNumber
              ? `Reservamos tus productos. Sigue los pasos para pagar; te escribiremos a ${order.customerEmail} cuando confirmemos el pago.`
              : `Reservamos tus productos. Te contactaremos a ${order.customerEmail} o por teléfono para confirmar el pago y el envío.`)}
        </p>
        <p className="text-sm text-muted-foreground">
          Guarda esta página: con su enlace puedes consultar el estado del pedido.
        </p>
      </div>

      <PaymentInstructions order={order} settings={settings} token={token ?? ""} />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="productos" className="rounded-xl border bg-card p-5 sm:p-6">
          <h2 id="productos" className="mb-4 text-lg font-bold">
            Productos
          </h2>
          <ul className="grid divide-y">
            {order.items.map((item) => (
              <li
                key={item.productId ?? item.sku}
                className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="grid min-w-0 gap-0.5">
                  <span className="font-semibold">{item.productName}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    SKU {item.sku} · {item.quantity} × {formatCOP(item.unitPrice)}
                  </span>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCOP(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatCOP(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Envío</dt>
              <dd>
                {order.shippingCost === null ? "Por confirmar" : formatCOP(order.shippingCost)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-heading text-xl font-bold font-stretch-112% tabular-nums">
                {formatCOP(order.total)}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="entrega" className="grid gap-3 rounded-xl border bg-card p-5">
          <h2 id="entrega" className="text-lg font-bold">
            Entrega
          </h2>
          <address className="grid gap-1 text-sm not-italic">
            <span className="font-semibold">{order.customerName}</span>
            <span>{order.address}</span>
            <span>
              {order.city}, {order.department}
            </span>
            {order.notes && <span className="text-muted-foreground">{order.notes}</span>}
          </address>
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/productos">Seguir comprando</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Ir al inicio</Link>
        </Button>
        {settings.whatsappNumber && (
          <Button asChild variant="secondary">
            <a
              href={whatsappLink(
                settings.whatsappNumber,
                `Hola, tengo una pregunta sobre mi pedido #${order.orderNumber}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircleIcon aria-hidden />
              Preguntar por mi pedido
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function OrderPage(props: PageProps<"/pedido/[id]">) {
  return (
    <main id="contenido" className="container-page py-10">
      <Suspense
        fallback={
          <div className="grid gap-4" aria-busy>
            <span className="sr-only">Cargando pedido…</span>
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        }
      >
        <OrderContent {...props} />
      </Suspense>
    </main>
  );
}
