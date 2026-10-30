"use client";

import { ChevronDownIcon, ExternalLinkIcon, SearchIcon, StoreIcon, TrophyIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ArchitectPart } from "@/features/architect/types";
import { partPricing, type PartPricing } from "@/features/offers/compare";
import { daysSince, searchLinks } from "@/features/offers/stores";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

const usd = new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" });

function checkedText(date: string): string {
  const days = daysSince(date, Date.now());
  if (days === 0) return "revisado hoy";
  if (days === 1) return "revisado ayer";
  return `revisado hace ${days} días`;
}

/** Línea corta bajo el precio: si afuera es más barato, dónde; si no, que aquí es mejor. */
function Headline({ pricing, reference }: { pricing: PartPricing; reference: boolean }) {
  const { here, cheapest, offers } = pricing;
  if (!offers.length) return null;
  if (cheapest?.source === "offer" && here) {
    return (
      <span className="text-xs text-muted-foreground">
        Más barato en <strong className="text-foreground">{cheapest.label}</strong>:{" "}
        <span className="tabular-nums">{formatCOP(cheapest.cop ?? 0)}</span>
      </span>
    );
  }
  if (cheapest?.source === "here") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <TrophyIcon className="size-3.5" aria-hidden />
        El mejor precio está aquí
      </span>
    );
  }
  if (reference && cheapest?.source === "offer") {
    return (
      <span className="text-xs text-muted-foreground">
        Mejor precio en <strong className="text-foreground">{cheapest.label}</strong>
      </span>
    );
  }
  return null;
}

/** Lista de dónde conseguir la pieza: aquí, cada tienda y búsquedas. */
export function PriceList({ part, rate }: { part: ArchitectPart; rate: number | null }) {
  const pricing = partPricing(part, rate);
  const { here, offers, cheapest } = pricing;
  const best = (cop: number | null) => cheapest?.cop != null && cop === cheapest.cop;

  return (
    <div className="grid gap-2">
      <ul className="grid divide-y rounded-xl border bg-background text-sm">
        {here && (
          <li className="flex flex-wrap items-center justify-between gap-2 p-2.5">
            <span className="flex items-center gap-2 font-semibold">
              <StoreIcon className="size-4 text-primary" aria-hidden />
              {here.label}
              {cheapest?.source === "here" && (
                <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[0.6875rem] text-success">
                  Más barato
                </span>
              )}
            </span>
            <span className="text-right">
              <span className="block font-semibold tabular-nums">{formatCOP(here.cop)}</span>
              <span className={cn("text-xs", here.inStock ? "text-success" : "text-destructive")}>
                {here.inStock ? "En stock" : "Agotado"}
              </span>
            </span>
          </li>
        )}
        {offers.map((option) => (
          <li
            key={option.offer.id}
            className="flex flex-wrap items-center justify-between gap-2 p-2.5"
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="flex items-center gap-2 font-semibold">
                {option.label}
                {best(option.cop) && cheapest?.source === "offer" && (
                  <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[0.6875rem] text-success">
                    Más barato
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {checkedText(option.offer.checkedAt)}
                {option.offer.note ? ` · ${option.offer.note}` : ""}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-right">
                {option.cop !== null ? (
                  <span className="block font-semibold tabular-nums">{formatCOP(option.cop)}</span>
                ) : (
                  option.offer.price === null && (
                    <span className="block text-xs text-muted-foreground">Ver precio</span>
                  )
                )}
                {option.offer.currency === "USD" && option.offer.price !== null && (
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {usd.format(option.offer.price)}
                  </span>
                )}
              </span>
              <a
                href={option.offer.url}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
              >
                Ir
                <ExternalLinkIcon className="size-3" aria-hidden />
                <span className="sr-only">a {option.label} (se abre en otra pestaña)</span>
              </a>
            </span>
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <SearchIcon className="size-3.5" aria-hidden />
        Buscar en:
        {searchLinks(part.name).map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-primary"
          >
            {link.label}
          </a>
        ))}
      </p>
      {offers.length > 0 && (
        <p className="text-[0.6875rem] text-muted-foreground">
          Precios de otras tiendas revisados por nosotros en la fecha indicada: pueden haber
          cambiado y no incluyen envío ni impuestos de importación.
        </p>
      )}
    </div>
  );
}

/**
 * Comparación de precios de una pieza dentro de la lista: una línea corta y, al
 * abrirla, aquí y en cada tienda, con enlaces y búsquedas.
 */
export function PriceCompare({ part, rate }: { part: ArchitectPart; rate: number | null }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (part.demo) return null;
  const pricing = partPricing(part, rate);
  const count = pricing.offers.length + (pricing.here ? 1 : 0);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Headline pricing={pricing} reference={part.reference} />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-precios`}
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {pricing.offers.length ? `Comparar precios (${count})` : "Dónde conseguirla"}
          <ChevronDownIcon
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
      {open && (
        <div id={`${id}-precios`}>
          <PriceList part={part} rate={rate} />
        </div>
      )}
    </div>
  );
}
