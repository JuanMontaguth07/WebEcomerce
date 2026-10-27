"use client";

import { partStatus } from "@/features/compatibility/engine";
import {
  PART_KINDS,
  PART_LABELS,
  type CompatibilityResult,
  type PartKind,
} from "@/features/compatibility/types";
import type { PartIndex } from "@/features/architect/build";
import type { Selection } from "@/features/architect/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status";

/**
 * Piezas del equipo. En escritorio es una columna; en celular, una fila que se
 * desliza. El punto muestra si la pieza elegida encaja con las demás.
 */
export function SlotList({
  selection,
  index,
  results,
  active,
  onSelect,
}: {
  selection: Selection;
  index: PartIndex;
  results: CompatibilityResult[];
  active: PartKind;
  onSelect: (kind: PartKind) => void;
}) {
  const chosen = PART_KINDS.filter((kind) =>
    kind === "storage" ? selection.storage.length > 0 : Boolean(selection.parts[kind]),
  ).length;

  return (
    <nav aria-label="Piezas del equipo" className="grid min-w-0 content-start gap-2">
      <p className="text-eyebrow text-muted-foreground">
        Tu equipo · {chosen} de {PART_KINDS.length}
      </p>
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 lg:pb-0">
        {PART_KINDS.map((kind) => {
          const parts =
            kind === "storage"
              ? selection.storage.flatMap((id) => index.get(id) ?? [])
              : [selection.parts[kind]].flatMap((id) => (id ? (index.get(id) ?? []) : []));
          const total = parts.reduce((sum, part) => sum + part.price, 0);
          const status = parts.length ? (partStatus(results, kind) ?? "ok") : null;
          const name =
            parts.length > 1 ? `${parts.length} unidades` : (parts[0]?.name ?? "Pendiente");
          return (
            <li key={kind} className="w-52 shrink-0 snap-start lg:w-auto">
              <button
                type="button"
                aria-pressed={active === kind}
                onClick={() => onSelect(kind)}
                className={cn(
                  "grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors outline-none hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/40",
                  active === kind && "border-primary bg-primary-soft",
                )}
              >
                <StatusDot status={status} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-eyebrow text-muted-foreground">
                      {PART_LABELS[kind]}
                    </span>
                    {parts.length > 0 && (
                      <span className="shrink-0 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                        {formatCOP(total)}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      !parts.length && "text-muted-foreground",
                    )}
                  >
                    {name}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
