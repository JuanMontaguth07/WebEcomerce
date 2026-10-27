"use client";

import { useId, useState } from "react";
import type { ProductSummary } from "@/features/catalog/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { SpotlightCard } from "./spotlight-card";

const ALL = "__todo";
/** Pestañas de categoría como máximo (las que más destacados tienen). */
const MAX_TABS = 4;
/** Tarjetas junto a la destacada: llenan dos filas a su lado en escritorio. */
const AROUND = 4;

/**
 * Selección de la tienda con pestañas por categoría: la primera de cada pestaña
 * va en grande y las demás alrededor. Cambiar de pestaña no recarga la página.
 */
export function FeaturedTabs({ products }: { products: ProductSummary[] }) {
  const id = useId();
  const [tab, setTab] = useState(ALL);

  const counts = new Map<string, { name: string; count: number }>();
  for (const product of products) {
    const current = counts.get(product.category.slug);
    counts.set(product.category.slug, {
      name: product.category.name,
      count: (current?.count ?? 0) + 1,
    });
  }
  const tabs = [...counts]
    .filter(([, value]) => value.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_TABS);

  const shown = tab === ALL ? products : products.filter((item) => item.category.slug === tab);
  const [spotlight, ...rest] = shown;

  return (
    <div className="grid gap-5">
      {tabs.length > 1 && (
        <div
          role="group"
          aria-label="Filtrar la selección por categoría"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
        >
          {[[ALL, { name: "Todo", count: products.length }] as const, ...tabs].map(
            ([slug, value]) => (
              <button
                key={slug}
                type="button"
                aria-pressed={tab === slug}
                aria-controls={`${id}-panel`}
                onClick={() => setTab(slug)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  tab === slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {value.name}
                <span className="ml-1.5 font-mono text-xs opacity-70">{value.count}</span>
              </button>
            ),
          )}
        </div>
      )}
      <div
        key={tab}
        id={`${id}-panel`}
        className="grid animate-in gap-3 duration-500 fade-in-0 slide-in-from-bottom-2 sm:gap-4 lg:grid-cols-4"
      >
        {spotlight && <SpotlightCard product={spotlight} className="lg:col-span-2" />}
        {/* En celular y tablet, una fila que se desliza; en escritorio, dos por dos. */}
        {rest.length > 0 && (
          <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 md:-mx-6 md:scroll-px-6 md:px-6 lg:col-span-2 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0">
            {rest.slice(0, AROUND).map((product) => (
              <li key={product.id} className="flex w-64 shrink-0 snap-start lg:w-auto">
                <ProductCard product={product} className="w-full" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
