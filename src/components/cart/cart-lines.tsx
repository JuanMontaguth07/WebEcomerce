"use client";

import { AlertTriangleIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CartItem } from "@/features/cart/logic";
import type { CartQuote, QuoteLine } from "@/features/cart/quote";
import { cartActions } from "@/features/cart/store";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./quantity-stepper";

function LineNotice({ line }: { line: QuoteLine }) {
  if (line.status === "ok") return null;
  const unavailable = line.status === "unavailable";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
      <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden />
      <span className="flex-1">
        {unavailable
          ? "Ya no está disponible."
          : `Solo quedan ${line.available} ${line.available === 1 ? "unidad" : "unidades"}.`}
      </span>
      <button
        type="button"
        onClick={() =>
          unavailable
            ? cartActions.remove(line.productId)
            : cartActions.setQuantity(line.productId, line.available)
        }
        className="font-semibold underline underline-offset-2"
      >
        {unavailable ? "Quitar" : `Ajustar a ${line.available}`}
      </button>
    </div>
  );
}

/** Lista de productos del carrito con cantidades, precios del servidor y avisos de stock. */
export function CartLines({
  items,
  quote,
  compact = false,
  onNavigate,
}: {
  items: CartItem[];
  quote: CartQuote | null;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  if (!quote) {
    return (
      <ul className="grid gap-4" aria-busy>
        {items.map((item) => (
          <li key={item.productId} className="flex gap-3">
            <Skeleton className="size-20 shrink-0 rounded-lg" />
            <div className="grid flex-1 content-start gap-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid divide-y">
      {quote.lines.map((line) => {
        const product = line.product;
        const name = product?.name ?? "Producto no disponible";
        return (
          <li key={line.productId} className="grid gap-2 py-4 first:pt-0 last:pb-0">
            <div className="flex gap-3">
              <div
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-lg border bg-secondary",
                  compact ? "size-16" : "size-20 sm:size-24",
                )}
              >
                <ProductImage
                  image={product?.image ?? null}
                  categorySlug={product?.categorySlug ?? ""}
                  fallbackAlt={name}
                  sizes="96px"
                  className="p-1.5"
                />
              </div>
              <div className="grid min-w-0 flex-1 content-start gap-1">
                {product ? (
                  <Link
                    href={`/productos/${product.slug}`}
                    onClick={onNavigate}
                    className="line-clamp-2 text-sm font-semibold hover:text-primary hover:underline"
                  >
                    {product.name}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">{name}</span>
                )}
                {product && (
                  <span className="font-mono text-[0.6875rem] text-muted-foreground">
                    SKU {product.sku}
                  </span>
                )}
                {product && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatCOP(product.price)} c/u
                  </span>
                )}
              </div>
              <div className="grid shrink-0 content-start justify-items-end gap-2">
                <span className="font-semibold tabular-nums">
                  {line.status === "ok" ? formatCOP(line.lineTotal) : "—"}
                </span>
              </div>
            </div>
            <LineNotice line={line} />
            <div className="flex items-center justify-between gap-3">
              {product && line.status !== "unavailable" ? (
                <QuantityStepper
                  size="sm"
                  value={line.requested}
                  max={Math.max(line.available, line.requested)}
                  onChange={(value) => cartActions.setQuantity(line.productId, value)}
                  label={name}
                />
              ) : (
                <span />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cartActions.remove(line.productId)}
                aria-label={`Quitar ${name} del carrito`}
              >
                <Trash2Icon aria-hidden />
                Quitar
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
