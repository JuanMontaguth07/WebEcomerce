import type { CartQuote } from "@/features/cart/quote";
import { formatCOP } from "@/lib/format";

/** Subtotal, envío y total. El envío se confirma con el cliente (sin tarifa definida). */
export function CartSummary({ quote }: { quote: CartQuote | null }) {
  const subtotal = quote?.subtotal ?? 0;
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
        <dd className="text-right">Por confirmar</dd>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-3">
        <dt className="font-semibold">Total</dt>
        <dd className="font-heading text-xl font-bold font-stretch-112% tabular-nums">
          {quote ? formatCOP(subtotal) : "—"}
        </dd>
      </div>
      <p className="text-xs text-muted-foreground">
        Te contactaremos para confirmar el costo de envío antes de despachar.
      </p>
    </dl>
  );
}
