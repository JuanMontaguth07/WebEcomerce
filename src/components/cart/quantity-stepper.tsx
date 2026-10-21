"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Selector de cantidad accesible (botones − / + y campo numérico). */
export function QuantityStepper({
  value,
  onChange,
  max,
  label,
  size = "default",
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  max: number;
  /** Nombre del producto, para las etiquetas accesibles. */
  label: string;
  size?: "default" | "sm";
  className?: string;
}) {
  const limit = Math.max(1, Math.min(max, 99));
  const set = (next: number) => onChange(Math.max(1, Math.min(limit, Math.floor(next) || 1)));
  const box = size === "sm" ? "size-8" : "size-10";

  return (
    <div className={cn("inline-flex items-center rounded-lg border bg-card", className)}>
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= 1}
        aria-label={`Quitar una unidad de ${label}`}
        className={cn(
          box,
          "grid place-items-center rounded-l-lg hover:bg-secondary disabled:opacity-40",
        )}
      >
        <MinusIcon className="size-4" aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={limit}
        value={value}
        onChange={(event) => set(Number(event.target.value))}
        aria-label={`Cantidad de ${label}`}
        className={cn(
          "w-10 [appearance:textfield] bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-inner-spin-button]:appearance-none",
          size === "sm" ? "h-8" : "h-10",
        )}
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={value >= limit}
        aria-label={`Agregar una unidad de ${label}`}
        className={cn(
          box,
          "grid place-items-center rounded-r-lg hover:bg-secondary disabled:opacity-40",
        )}
      >
        <PlusIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
