import type { CartQuote } from "@/features/cart/quote";
import { deliveryLabel, type ShippingQuote } from "@/features/shipping/types";
import { formatCOP } from "@/lib/format";

/**
 * Envío según el lugar: sin elegir (carrito), calculando, con tarifa o sin tarifa
 * para ese lugar ("por confirmar"). El valor definitivo lo calcula la base al crear
 * el pedido.
 */
export type ShippingState =
  | { status: "pending-place" }
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "quoted"; quote: ShippingQuote };

export function CartSummary({
  quote,
  shipping,
}: {
  quote: CartQuote | null;
  /** Sin valor (carrito): el envío se calcula en el checkout. */
  shipping?: ShippingState;
}) {
  const subtotal = quote?.subtotal ?? 0;
  const shippingPrice = shipping?.status === "quoted" ? shipping.quote.price : 0;
  const delivery = shipping?.status === "quoted" ? deliveryLabel(shipping.quote) : null;

  const shippingValue = !shipping
    ? "En el checkout"
    : shipping.status === "quoted"
      ? shipping.quote.price === 0
        ? "Gratis"
        : formatCOP(shipping.quote.price)
      : shipping.status === "loading"
        ? "Calculando…"
        : shipping.status === "pending-place"
          ? "Elige tu ciudad"
          : "Por confirmar";

  const note = !shipping
    ? "El costo de envío se calcula en el checkout según tu ciudad."
    : shipping.status === "quoted"
      ? delivery
        ? `Entrega estimada: ${delivery}.`
        : null
      : shipping.status === "unavailable"
        ? "Aún no tenemos tarifa para tu ciudad: te confirmaremos el costo de envío antes de despachar."
        : shipping.status === "pending-place"
          ? "Elige departamento y ciudad para ver el costo de envío."
          : null;

  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">
          Subtotal {quote ? `(${quote.units} ${quote.units === 1 ? "unidad" : "unidades"})` : ""}
        </dt>
        <dd className="font-semibold tabular-nums">{quote ? formatCOP(subtotal) : "—"}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Envío</dt>
        <dd className="text-right tabular-nums" aria-live="polite">
          {shippingValue}
        </dd>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-3">
        <dt className="font-semibold">Total</dt>
        <dd className="font-heading text-xl font-bold font-stretch-112% tabular-nums">
          {quote ? formatCOP(subtotal + shippingPrice) : "—"}
        </dd>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </dl>
  );
}
