"use client";

import { useEffect, useRef } from "react";
import { formatCOP } from "@/lib/format";

const integer = new Intl.NumberFormat("es-CO");
const DURATION_MS = 900;

/**
 * Cifra que sube desde cero al aparecer. El servidor ya pinta el valor final
 * (sin JavaScript se ve igual) y los lectores de pantalla leen solo ese valor.
 * Con «reducir movimiento» no se anima.
 */
export function CountUp({ value, format }: { value: number; format: "cop" | "number" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const show = (amount: number) => (format === "cop" ? formatCOP(amount) : integer.format(amount));

  useEffect(() => {
    const node = ref.current;
    if (!node || value <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const render = (amount: number) =>
      format === "cop" ? formatCOP(amount) : integer.format(amount);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      // Frena al final (ease-out cúbico).
      const eased = 1 - (1 - progress) ** 3;
      node.textContent = render(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      node.textContent = render(value);
    };
  }, [value, format]);

  return (
    <>
      <span className="sr-only">{show(value)}</span>
      <span ref={ref} aria-hidden>
        {show(value)}
      </span>
    </>
  );
}
