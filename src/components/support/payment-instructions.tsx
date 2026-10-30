import { MessageCircleIcon, SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicOrder } from "@/features/orders/queries";
import type { StoreSettings } from "@/features/store-settings/types";
import { formatPhone, whatsappLink } from "@/features/store-settings/types";
import { formatCOP } from "@/lib/format";
import { CopyButton } from "./copy-button";
import { ReceiptUpload } from "./receipt-upload";

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
  token,
}: {
  order: PublicOrder;
  settings: StoreSettings;
  /** El del enlace privado del pedido: permite subir el comprobante. */
  token: string;
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
          {shippingPending ? (
            <div className="grid gap-3">
              <p>Pídenos el valor del envío a tu ciudad; con él completas el pago.</p>
              {settings.whatsappNumber && (
                <Button asChild className="w-fit">
                  <a
                    href={whatsappLink(settings.whatsappNumber, whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircleIcon aria-hidden />
                    Pedir el valor del envío
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid min-w-0 flex-1 gap-3">
              <p>
                Sube aquí la captura del pago de tu pedido{" "}
                <strong className="font-mono">#{order.orderNumber}</strong>. La revisamos y te
                avisamos.
              </p>
              <ReceiptUpload
                orderId={order.id}
                token={token}
                receipt={order.receipt}
                amount={amount}
              />
              {settings.whatsappNumber ? (
                <a
                  href={whatsappLink(settings.whatsappNumber, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  <MessageCircleIcon className="size-4" aria-hidden />
                  ¿Prefieres enviarlo por WhatsApp?
                </a>
              ) : (
                settings.supportEmail && (
                  <p className="text-sm text-muted-foreground">
                    También puedes enviarlo a{" "}
                    <strong className="break-all text-foreground">{settings.supportEmail}</strong>.
                  </p>
                )
              )}
            </div>
          )}
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
