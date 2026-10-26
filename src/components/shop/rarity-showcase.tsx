import { ArrowRightIcon, GemIcon } from "lucide-react";
import Link from "next/link";
import type { ProductSummary } from "@/features/catalog/types";
import type { Rarity } from "@/features/rarities/types";
import { cn } from "@/lib/utils";
import { ProductGrid } from "./product-grid";
import { RarityBadge } from "./rarity-badge";

/**
 * Halos decorativos con los colores de las rarezas. Son transparentes, así que
 * funcionan sobre el fondo claro y el oscuro.
 */
export function RarityGlows({ rarities, className }: { rarities: Rarity[]; className?: string }) {
  const positions = ["-top-24 -left-16", "-right-20 -bottom-28", "top-1/3 left-1/2"];
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10", className)}>
      {rarities.slice(0, 3).map((rarity, index) => (
        <span
          key={rarity.id}
          className={cn("absolute size-72 rounded-full opacity-20 blur-3xl", positions[index])}
          style={{ background: rarity.color }}
        />
      ))}
    </div>
  );
}

/** Bloque «Rarezas» de la portada. No se muestra si ningún producto tiene rareza. */
export function RarityShowcase({ products }: { products: ProductSummary[] }) {
  if (!products.length) return null;

  const rarities = [
    ...new Map(
      products.flatMap((p) => (p.rarity ? [[p.rarity.id, p.rarity] as const] : [])),
    ).values(),
  ].sort((a, b) => b.position - a.position);
  // Filas completas en escritorio (4 columnas).
  const shown = products.length > 4 ? products.slice(0, products.length >= 8 ? 8 : 4) : products;

  return (
    <section aria-labelledby="rarezas" className="container-page">
      <div className="relative isolate grid gap-6 overflow-hidden rounded-3xl border bg-card/60 p-5 sm:p-8">
        <RarityGlows rarities={rarities} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-eyebrow text-primary">Colección</p>
            <h2 id="rarezas" className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
              <GemIcon className="size-7 text-primary" aria-hidden />
              Rarezas
            </h2>
            <p className="max-w-prose text-muted-foreground">
              Piezas difíciles de conseguir, ediciones especiales y lo más exclusivo de la tienda.
            </p>
            <ul aria-label="Niveles de rareza" className="flex flex-wrap gap-2 pt-1">
              {rarities.map((rarity) => (
                <li key={rarity.id}>
                  <RarityBadge rarity={rarity} />
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/rarezas"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Ver todas las rarezas
            <ArrowRightIcon
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
        <ProductGrid products={shown} />
      </div>
    </section>
  );
}
