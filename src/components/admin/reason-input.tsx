"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const QUICK_REASONS = ["Era una prueba", "Ya no lo vendo", "Producto duplicado"] as const;

/** Motivo opcional con atajos; queda en el historial junto al borrado. */
export function ReasonInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="font-semibold">
        Motivo <span className="font-normal text-muted-foreground">(queda en el historial)</span>
      </Label>
      <div className="flex flex-wrap gap-1">
        {QUICK_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            onClick={() => onChange(reason)}
            aria-pressed={value === reason}
            className="rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:border-input aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
          >
            {reason}
          </button>
        ))}
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Opcional"
      />
    </div>
  );
}
