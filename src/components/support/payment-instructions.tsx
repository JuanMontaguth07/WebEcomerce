import { MessageCircleIcon, SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicOrder } from "@/features/orders/queries";
import type { StoreSettings } from "@/features/store-settings/types";
import { formatPhone, whatsappLink } from "@/features/store-settings/types";
import { formatCOP } from "@/lib/format";
import { CopyButton } from "./copy-button";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

/**
 * Pasos para pagar un pedido pendiente por transferencia a Nequi. Solo aparece
 * si hay un número de Nequi configurado en el panel.
 */
export function PaymentInstructions({
  order,
  settings,
}: {
  order: PublicOrder;
  settings: StoreSettings;
}) {
  if (order.status !== "pending" || !settings.nequiNumber) return null;

  const nequi = formatPhone(`57${settings.nequiNumber}`);
  const shippingPending = order.shippingCost === null;
  const amount = formatCOP(order.total);
  // Sin tarifa para la ciudad, primero se pide el valor del envío: el comprobante sería por un monto incompleto.
  const whatsappMessage = shippingPending
    ? `Hola, hice el pedido #${order.orderNumber}. ¿Cuál es el valor del envío a ${order.city}?`
    : `Hola, adjunto el comprobante de pago de mi pedido #${order.orderNumber} por ${amount}.`;

  return (
    <section
      aria-labelledby="como-pagar"
      className="relative grid gap-6 overflow-hidden rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-glow sm:p-7"
    >
      <div className="grid gap-1">
        <p className="text-eyebrow text-primary">Siguiente paso</p>
        <h2 id="como-pagar" className="text-2xl font-extrabold">
          Paga con Nequi
        </h2>
      </div>

      {shippingPending && (
        <p role="note" className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
          Aún no tenemos tarifa de envío para tu ciudad. Antes de pagar, espera nuestro mensaje con
          el valor del envío; el total cambiará.
        </p>
      )}

      <ol className="grid gap-5">
        <li className="flex gap-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-mono text-sm font-bold text-primary-foreground">
            1
          </span>
          <div className="grid gap-3">
            <p>
              Transfiere{" "}
              <strong className="font-heading text-lg tabular-nums">
                {amount}
                {shippingPending && " + envío"}
              </strong>{" "}
              a este Nequi:
            </p>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3">
              <SmartphoneIcon className="size-5 text-primary" aria-hidden />
              <span className="font-mono text-lg font-bold tracking-wide select-all">{nequi}</span>
              <CopyButton value={settings.nequiNumber} label="Copiar número de Nequi" />
            </div>
            {settings.nequiHolder && (
              <p className="text-sm text-muted-foreground">
                A nombre de <strong className="text-foreground">{settings.nequiHolder}</strong>.
              </p>
            )}
          </div>
        </li>
        <li className="flex gap-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-mono text-sm font-bold text-primary-foreground">
            2
          </span>
          <div className="grid gap-3">
            <p>
              Envíanos el comprobante indicando tu pedido{" "}
              <strong className="font-mono">#{order.orderNumber}</strong>
              {!settings.whatsappNumber && settings.supportEmail && (
                <>
                  {" "}
                  a <strong className="break-all">{settings.supportEmail}</strong>
                </>
              )}
              .
            </p>
            {settings.whatsappNumber && (
              <Button asChild className="w-fit">
                <a
                  href={whatsappLink(settings.whatsappNumber, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircleIcon aria-hidden />
                  {shippingPending ? "Pedir el valor del envío" : "Enviar comprobante por WhatsApp"}
                </a>
              </Button>
            )}
          </div>
        </li>
        <li className="flex gap-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-mono text-sm font-bold text-primary-foreground">
            3
          </span>
          <p className="pt-1">Confirmamos tu pago y preparamos el envío.</p>
        </li>
      </ol>

      {order.expiresAt && (
        <p className="border-t pt-4 text-sm text-muted-foreground">
          Reservamos tus productos hasta el{" "}
          <strong className="text-foreground">
            {dateFormatter.format(new Date(order.expiresAt))}
          </strong>
          ; si no recibimos el pago para entonces, el pedido se cancela automáticamente.
        </p>
      )}
    </section>
  );
}
