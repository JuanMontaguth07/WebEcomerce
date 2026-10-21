"use client";

import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { CartLines } from "@/components/cart/cart-lines";
import { CartSummary } from "@/components/cart/cart-summary";
import { useCartQuote } from "@/components/cart/use-cart-quote";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/store";

export function CartView() {
  const { items } = useCart();
  const { quote, error, loading } = useCartQuote(items);

  if (!items.length) {
    return (
      <div className="grid justify-items-center gap-4 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
        <ShoppingCartIcon className="size-10 text-muted-foreground" aria-hidden />
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Tu carrito está vacío</h2>
          <p className="text-sm text-muted-foreground">
            Explora el catálogo y agrega los productos que necesitas.
          </p>
        </div>
        <Button asChild>
          <Link href="/productos">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <section
        aria-label="Productos en el carrito"
        className="rounded-xl border bg-card p-4 sm:p-6"
      >
        <CartLines items={items} quote={quote} />
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
      <aside
        aria-label="Resumen del pedido"
        className="grid gap-5 rounded-xl border bg-card p-5 lg:sticky lg:top-32"
      >
        <h2 className="text-lg font-bold">Resumen</h2>
        <CartSummary quote={quote} />
        {quote && !quote.ready && (
          <p className="text-sm text-warning" role="status">
            Ajusta los productos marcados para continuar.
          </p>
        )}
        {quote?.ready ? (
          <Button asChild size="lg">
            <Link href="/checkout">Continuar con la compra</Link>
          </Button>
        ) : (
          <Button size="lg" disabled isLoading={loading}>
            Continuar con la compra
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/productos">Seguir comprando</Link>
        </Button>
      </aside>
    </div>
  );
}
