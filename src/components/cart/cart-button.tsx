"use client";

import { m } from "motion/react";
import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/features/cart/store";
import { CartLines } from "./cart-lines";
import { CartSummary } from "./cart-summary";
import { useCartQuote } from "./use-cart-quote";

/** Ícono del carrito en el encabezado, con contador y panel lateral. */
export function CartButton() {
  const { items, units } = useCart();
  const [open, setOpen] = useState(false);
  const { quote, error } = useCartQuote(items, open);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            units ? `Carrito: ${units} ${units === 1 ? "unidad" : "unidades"}` : "Carrito vacío"
          }
        >
          <ShoppingCartIcon aria-hidden />
          {units > 0 && (
            <m.span
              key={units}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-primary px-1 text-center font-mono text-[0.6875rem] leading-5 text-primary-foreground tabular-nums"
              aria-hidden
            >
              {units > 99 ? "99+" : units}
            </m.span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[92vw] max-w-md gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="font-heading font-stretch-112%">Tu carrito</SheetTitle>
          <SheetDescription>
            {units
              ? `${units} ${units === 1 ? "unidad" : "unidades"}`
              : "Aún no has agregado productos."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length ? (
            <CartLines items={items} quote={quote} compact onNavigate={close} />
          ) : (
            <div className="grid justify-items-center gap-3 py-12 text-center">
              <ShoppingCartIcon className="size-10 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Tu carrito está vacío.</p>
              <Button asChild variant="secondary" onClick={close}>
                <Link href="/productos">Explorar productos</Link>
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="gap-4 border-t p-4">
            <CartSummary quote={quote} />
            <div className="grid gap-2">
              <Button asChild size="lg" onClick={close}>
                <Link href="/checkout">Continuar con la compra</Link>
              </Button>
              <Button asChild variant="ghost" onClick={close}>
                <Link href="/carrito">Ver carrito completo</Link>
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
