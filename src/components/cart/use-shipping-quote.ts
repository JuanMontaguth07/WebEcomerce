"use client";

import { useEffect, useState } from "react";
import { quoteShipping } from "@/features/shipping/actions";
import type { ShippingState } from "./cart-summary";

type QuoteState = { key: string; state: ShippingState };

/**
 * Cotiza el envío al lugar que el cliente va escribiendo (con una breve espera
 * para no consultar en cada tecla). Es informativo: el valor que se cobra lo
 * calcula la base de datos al crear el pedido.
 */
export function useShippingQuote(department: string, city: string): ShippingState {
  const trimmedCity = city.trim();
  const ready = Boolean(department) && trimmedCity.length >= 2;
  const key = `${department}|${trimmedCity.toLowerCase()}`;
  const [result, setResult] = useState<QuoteState | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const response = await quoteShipping({ department, city: trimmedCity });
      if (cancelled) return;
      setResult({
        key,
        state:
          response.ok && response.data
            ? { status: "quoted", quote: response.data }
            : { status: "unavailable" },
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, ready, department, trimmedCity]);

  if (!ready) return { status: "pending-place" };
  return result?.key === key ? result.state : { status: "loading" };
}
