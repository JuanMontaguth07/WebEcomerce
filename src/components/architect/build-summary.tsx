"use client";

import {
  MessageCircleIcon,
  RotateCcwIcon,
  Share2Icon,
  ShoppingCartIcon,
  StoreIcon,
} from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import type { BudgetUsage } from "@/features/architect/build";
import type { BuildStats } from "@/features/architect/stats";
import type { BuildPricing } from "@/features/offers/compare";
import type { CompatibilityResult, CompatibilityStatus } from "@/features/compatibility/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BuildStatsPanel } from "./build-stats";
import { StatusDot, StatusLabel } from "./status";

/** Presupuesto máximo que acepta el campo (evita cifras por error de tipeo). */
export const MAX_BUDGET = 200_000_000;

const HEADLINE: Record<CompatibilityStatus, string> = {
  ok: "Todo encaja",
  warning: "Funciona, con reparos",
  error: "Hay piezas que no encajan",
  unknown: "Faltan datos para confirmar algunas cosas",
};

/** Resumen del equipo: presupuesto, total, consumo, compatibilidad y acciones. */
export function BuildSummary({
  total,
  budget,
  usage,
  onBudgetChange,
  stats,
  results,
  status,
  count,
  pricing,
  onWhereToBuy,
  cart,
  onAddToCart,
  onShare,
  onQuote,
  onReset,
}: {
  total: number;
  budget: number | null;
  usage: BudgetUsage | null;
  onBudgetChange: (budget: number | null) => void;
  /** Rendimiento, consumo y demás (null si no hay piezas). */
  stats: BuildStats | null;
  results: CompatibilityResult[];
  status: CompatibilityStatus | null;
  count: number;
  /** Totales comprando aquí y combinando tiendas (null si no hay nada que comparar). */
  pricing: BuildPricing | null;
  onWhereToBuy: () => void;
  /** Si se puede comprar y, si no, por qué (piezas demo, nada elegido, agotadas). */
  cart: { ready: true } | { ready: false; reason: string };
  onAddToCart: () => void;
  onShare: () => void;
  /** Sin WhatsApp configurado en la tienda no se ofrece. */
  onQuote: (() => void) | null;
  onReset: () => void;
}) {
  const id = useId();

  return (
    <div className="grid content-start gap-5">
      <div className="grid gap-2">
        <label htmlFor={`${id}-budget`} className="text-sm font-semibold">
          Presupuesto <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-muted-foreground">
            $
          </span>
          <input
            id={`${id}-budget`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej.: 6.000.000"
            value={budget ? budget.toLocaleString("es-CO") : ""}
            onChange={(event) => {
              const digits = Number(event.target.value.replace(/\D/g, "").slice(0, 9));
              onBudgetChange(digits ? Math.min(digits, MAX_BUDGET) : null);
            }}
            className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-7 font-mono text-sm tabular-nums"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-eyebrow text-muted-foreground">
          Total · {count} {count === 1 ? "pieza" : "piezas"}
        </span>
        <span className="font-heading text-3xl font-extrabold font-stretch-112% tabular-nums">
          {formatCOP(total)}
        </span>
        {usage && (
          <div className="grid gap-1.5">
            <div
              role="meter"
              aria-label="Presupuesto usado"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(usage.percent, 100)}
              aria-valuetext={`${usage.percent} %`}
              className="h-2 overflow-hidden rounded-full bg-secondary"
            >
              <div
                className={cn("h-full rounded-full", usage.over ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.min(usage.percent, 100)}%` }}
              />
            </div>
            <p
              className={cn(
                "flex justify-between gap-2 text-xs",
                usage.over ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <span>Usado {usage.percent} %</span>
              <span className="tabular-nums">
                {usage.over
                  ? `Te pasas por ${formatCOP(-usage.remaining)}`
                  : `Te quedan ${formatCOP(usage.remaining)}`}
              </span>
            </p>
          </div>
        )}
      </div>

      {stats && <BuildStatsPanel stats={stats} />}

      {pricing && (
        <section
          aria-labelledby={`${id}-precios`}
          className="grid gap-3 rounded-xl border bg-background p-3"
        >
          <h2 id={`${id}-precios`} className="flex items-center gap-2 text-sm font-semibold">
            <StoreIcon className="size-4 text-primary" aria-hidden />
            Dónde comprar
          </h2>
          <dl className="grid gap-1.5 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">
                Comprando aquí{" "}
                <span className="text-xs">
                  ({pricing.here.count} de {count})
                </span>
              </dt>
              <dd className="font-semibold tabular-nums">{formatCOP(pricing.here.total)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">
                Mejor precio combinado{" "}
                <span className="text-xs">
                  ({pricing.best.count} de {count})
                </span>
              </dt>
              <dd className="font-semibold tabular-nums">{formatCOP(pricing.best.total)}</dd>
            </div>
          </dl>
          {pricing.savings > 0 && (
            <p className="text-xs text-success">
              Combinando tiendas ahorrarías {formatCOP(pricing.savings)} en lo que también vendemos.
            </p>
          )}
          {pricing.unpriced > 0 && (
            <p className="text-xs text-muted-foreground">
              {pricing.unpriced === 1
                ? "1 pieza no tiene precio conocido: búscala con los enlaces."
                : `${pricing.unpriced} piezas no tienen precio conocido: búscalas con los enlaces.`}
            </p>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={onWhereToBuy}>
            Ver dónde comprar cada pieza
          </Button>
        </section>
      )}

      <section aria-labelledby={`${id}-compat`} className="grid gap-3">
        <h2 id={`${id}-compat`} className="flex items-center gap-2 text-sm font-semibold">
          <StatusDot status={status} />
          {status ? HEADLINE[status] : "Compatibilidad"}
        </h2>
        {results.length ? (
          <ul className="grid divide-y rounded-xl border bg-background" aria-live="polite">
            {results.map((item) => (
              <li key={item.rule} className="grid gap-1 p-3">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.title}</span>
                  <StatusLabel status={item.status} />
                </span>
                <span className="text-xs text-muted-foreground">{item.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Elige al menos dos piezas y te decimos al momento si encajan.
          </p>
        )}
      </section>

      <div className="grid gap-2">
        <Button type="button" size="lg" disabled={!cart.ready} onClick={onAddToCart}>
          <ShoppingCartIcon aria-hidden />
          Agregar todo al carrito
        </Button>
        {!cart.ready && <p className="text-xs text-muted-foreground">{cart.reason}</p>}
        {cart.ready && status === "error" && (
          <p className="text-xs text-destructive">
            Revisa las piezas que no encajan antes de comprar.
          </p>
        )}
        {count > 0 && (
          <>
            <Button type="button" variant="secondary" onClick={onShare}>
              <Share2Icon aria-hidden />
              Guardar y compartir
            </Button>
            {onQuote && (
              <Button type="button" variant="secondary" onClick={onQuote}>
                <MessageCircleIcon aria-hidden />
                Pedir cotización por WhatsApp
              </Button>
            )}
          </>
        )}
        {count > 0 && (
          <Button type="button" variant="ghost" onClick={onReset}>
            <RotateCcwIcon aria-hidden />
            Empezar de nuevo
          </Button>
        )}
      </div>
    </div>
  );
}
