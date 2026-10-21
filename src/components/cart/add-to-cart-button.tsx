"use client";

import { AnimatePresence, m } from "motion/react";
import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/store";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./quantity-stepper";

type Props = {
  productId: string;
  name: string;
  stock: number;
  /** "full": selector de cantidad + botón (ficha). "icon": botón compacto (tarjetas). */
  variant?: "full" | "icon";
  className?: string;
};

export function AddToCartButton({ productId, name, stock, variant = "full", className }: Props) {
  const router = useRouter();
  const { items, add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const inCart = items.find((item) => item.productId === productId)?.quantity ?? 0;
  const remaining = Math.max(0, stock - inCart);
  const disabled = stock <= 0 || remaining <= 0;

  function handleAdd() {
    const units = Math.min(variant === "full" ? quantity : 1, remaining);
    if (units <= 0) return;
    add(productId, units, stock);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
    toast.success("Agregado al carrito", {
      description: units > 1 ? `${units} × ${name}` : name,
      action: { label: "Ver carrito", onClick: () => router.push("/carrito") },
    });
  }

  if (variant === "icon") {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant={added ? "default" : "secondary"}
        onClick={handleAdd}
        disabled={disabled}
        aria-label={disabled ? `${name}: sin unidades disponibles` : `Agregar ${name} al carrito`}
        className={cn("relative z-10", className)}
      >
        {added ? <CheckIcon aria-hidden /> : <ShoppingCartIcon aria-hidden />}
      </Button>
    );
  }

  if (stock <= 0) {
    return (
      <Button size="lg" disabled className={className}>
        Agotado
      </Button>
    );
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={Math.min(quantity, Math.max(1, remaining))}
          onChange={setQuantity}
          max={Math.max(1, remaining)}
          label={name}
        />
        <Button
          size="lg"
          onClick={handleAdd}
          disabled={disabled}
          className="min-w-52 flex-1 sm:flex-none"
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={added ? "added" : "idle"}
              className="inline-flex items-center gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {added ? <CheckIcon aria-hidden /> : <ShoppingCartIcon aria-hidden />}
              {added ? "Agregado" : "Agregar al carrito"}
            </m.span>
          </AnimatePresence>
        </Button>
      </div>
      {inCart > 0 && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Tienes {inCart} en el carrito
          {remaining === 0 ? " (todas las unidades disponibles)." : "."}
        </p>
      )}
    </div>
  );
}
