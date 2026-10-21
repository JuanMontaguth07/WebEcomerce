"use client";

import { useEffect, useState } from "react";
import { quoteCart } from "@/features/cart/actions";
import type { CartItem } from "@/features/cart/logic";
import type { CartQuote } from "@/features/cart/quote";

type QuoteState = { quote: CartQuote | null; error: string | null; key: string | null };

/**
 * Cotiza el carrito en el servidor cada vez que cambia (precios y stock reales).
 * Mientras llega la nueva cotización se conserva la anterior.
 */
export function useCartQuote(items: CartItem[], enabled = true) {
  // "nonce" permite volver a cotizar sin que cambie el carrito (p. ej. tras un error de stock).
  const [nonce, setNonce] = useState(0);
  const key = `${nonce}|${JSON.stringify(items)}`;
  const [state, setState] = useState<QuoteState>({ quote: null, error: null, key: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await quoteCart(JSON.parse(key.slice(key.indexOf("|") + 1)));
      if (cancelled) return;
      setState(
        result.ok
          ? { quote: result.data, error: null, key }
          : { quote: null, error: result.error.message, key },
      );
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, enabled]);

  return {
    quote: state.quote,
    error: state.error,
    loading: enabled && state.key !== key,
    refresh: () => setNonce((value) => value + 1),
  };
}
