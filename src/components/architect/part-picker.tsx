"use client";

import { CheckIcon, ExternalLinkIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { StockBadge } from "@/components/shop/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { candidateStatus, isChosen, MAX_DRIVES, type PartIndex } from "@/features/architect/build";
import type { ArchitectPart, Selection } from "@/features/architect/types";
import { PART_LABELS, type PartKind } from "@/features/compatibility/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { displayPrice } from "@/features/offers/compare";
import { PartThumb } from "./part-thumb";
import { PriceCompare } from "./price-compare";
import { StatusLabel } from "./status";

type Sort = "price-asc" | "price-desc" | "name";

const SORTS: { value: Sort; label: string }[] = [
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "name", label: "Nombre" },
];

/** Opciones de la pieza activa, con la compatibilidad que tendrían al elegirlas. */
export function PartPicker({
  kind,
  parts,
  selection,
  index,
  compare,
  rate,
  onChoose,
  onRemove,
  onToggleCompare,
}: {
  kind: PartKind;
  parts: ArchitectPart[];
  selection: Selection;
  index: PartIndex;
  compare: string[];
  /** Pesos por dólar para las ofertas en USD. */
  rate: number | null;
  onChoose: (part: ArchitectPart) => void;
  onRemove: (kind: PartKind, position?: number) => void;
  onToggleCompare: (part: ArchitectPart) => void;
}) {
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const [sort, setSort] = useState<Sort>("price-asc");
  const id = useId();

  const options = useMemo(() => {
    const rated = parts
      .filter((part) => part.kind === kind)
      .map((part) => ({ part, check: candidateStatus(selection, index, part) }));
    const sorted = [...rated].sort((a, b) =>
      sort === "name"
        ? a.part.name.localeCompare(b.part.name, "es")
        : sort === "price-asc"
          ? displayPrice(a.part, rate) - displayPrice(b.part, rate)
          : displayPrice(b.part, rate) - displayPrice(a.part, rate),
    );
    const hidden = sorted.filter(
      ({ part, check }) => check?.status === "error" && !isChosen(selection, part),
    ).length;
    return {
      list: onlyCompatible
        ? sorted.filter(({ part, check }) => check?.status !== "error" || isChosen(selection, part))
        : sorted,
      hidden,
    };
  }, [parts, kind, selection, index, sort, onlyCompatible, rate]);

  const drives = kind === "storage" ? selection.storage.flatMap((id) => index.get(id) ?? []) : [];
  const label = PART_LABELS[kind].toLocaleLowerCase("es-CO");

  return (
    <section aria-labelledby={`${id}-title`} className="grid min-w-0 content-start gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id={`${id}-title`} className="text-xl font-bold md:text-2xl">
          {kind === "storage" ? "Agrega almacenamiento" : `Elige tu ${label}`}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={onlyCompatible}
              onCheckedChange={(value) => setOnlyCompatible(value === true)}
            />
            Solo compatibles
          </label>
          <label className="sr-only" htmlFor={`${id}-sort`}>
            Ordenar
          </label>
          <select
            id={`${id}-sort`}
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {kind === "storage" && drives.length > 0 && (
        <div className="grid gap-2 rounded-xl border bg-card p-3">
          <p className="text-eyebrow text-muted-foreground">
            En tu equipo · {drives.length} de {MAX_DRIVES}
          </p>
          <ul className="grid gap-1.5">
            {drives.map((part, position) => (
              <li key={`${part.id}-${position}`} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{part.name}</span>
                <span className="font-mono text-xs tabular-nums">{formatCOP(part.price)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Quitar ${part.name}`}
                  onClick={() => onRemove("storage", position)}
                >
                  <XIcon aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {options.list.length ? (
        <ul className="grid gap-2.5">
          {options.list.map(({ part, check }) => {
            const chosen = isChosen(selection, part);
            const comparing = compare.includes(part.id);
            const full = kind === "storage" && selection.storage.length >= MAX_DRIVES;
            return (
              <li key={part.id}>
                <article
                  aria-label={part.name}
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border bg-card p-3 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
                    chosen && "border-primary bg-primary-soft/60",
                    check?.status === "error" && !chosen && "opacity-70",
                  )}
                >
                  <PartThumb part={part} />
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-sm leading-snug font-semibold">{part.name}</h3>
                      {part.demo && <Badge variant="outline">Demo</Badge>}
                      {part.reference && (
                        <Badge
                          variant="outline"
                          title="No se vende aquí: compárala en otras tiendas"
                        >
                          Referencia
                        </Badge>
                      )}
                    </div>
                    {part.keySpecs.length > 0 && (
                      <ul aria-label="Especificaciones clave" className="flex flex-wrap gap-1">
                        {part.keySpecs.map((spec) => (
                          <li
                            key={spec.label}
                            title={`${spec.label}: ${spec.text}`}
                            className="max-w-full truncate rounded-md bg-secondary px-1.5 py-1 font-mono text-[0.6875rem] leading-none"
                          >
                            {spec.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    {check && (
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                        <StatusLabel status={check.status} />
                        {check.status !== "ok" && (
                          <span className="text-muted-foreground">{check.message}</span>
                        )}
                      </p>
                    )}
                    <PriceCompare part={part} rate={rate} />
                  </div>
                  <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:grid sm:justify-items-end">
                    <span className="grid gap-1 sm:justify-items-end">
                      <span className="font-heading text-base font-bold font-stretch-112% tabular-nums">
                        {part.reference && (
                          <span className="mr-1 font-sans text-xs font-normal text-muted-foreground">
                            Desde
                          </span>
                        )}
                        {formatCOP(displayPrice(part, rate))}
                      </span>
                      {part.reference ? (
                        <span className="text-xs text-muted-foreground">No se vende aquí</span>
                      ) : part.stock === null ? (
                        <span className="text-xs text-muted-foreground">Precio de ejemplo</span>
                      ) : (
                        <StockBadge stock={part.stock} lowStockThreshold={part.lowStockThreshold} />
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Checkbox
                          checked={comparing}
                          disabled={!comparing && compare.length >= 2}
                          onCheckedChange={() => onToggleCompare(part)}
                        />
                        Comparar
                      </label>
                      {kind === "storage" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={chosen ? "secondary" : "default"}
                          disabled={full}
                          onClick={() => onChoose(part)}
                        >
                          <PlusIcon aria-hidden />
                          {chosen ? "Otra unidad" : "Agregar"}
                        </Button>
                      ) : chosen ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => onRemove(kind)}
                        >
                          <CheckIcon aria-hidden />
                          Elegida · quitar
                        </Button>
                      ) : (
                        <Button type="button" size="sm" onClick={() => onChoose(part)}>
                          Elegir
                        </Button>
                      )}
                    </span>
                    {part.slug && (
                      <Link
                        href={`/productos/${part.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Ver ficha
                        <ExternalLinkIcon className="size-3" aria-hidden />
                        <span className="sr-only">(se abre en otra pestaña)</span>
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          {parts.some((part) => part.kind === kind)
            ? "Ninguna opción encaja con lo que ya elegiste. Desmarca «Solo compatibles» para verlas todas."
            : `Todavía no hay ${label} con ficha técnica en el catálogo.`}
        </p>
      )}
      {onlyCompatible && options.hidden > 0 && options.list.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {options.hidden === 1
            ? "Hay 1 opción oculta porque no encaja con tu equipo."
            : `Hay ${options.hidden} opciones ocultas porque no encajan con tu equipo.`}
        </p>
      )}
    </section>
  );
}
