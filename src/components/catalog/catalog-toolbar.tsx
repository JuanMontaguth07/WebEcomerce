"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { hasActiveFilters, SORT_OPTIONS, type SortValue } from "@/features/catalog/params";
import type { CatalogFacets, SpecFacet } from "@/features/catalog/types";
import { CatalogFilters, type CategoryFilterMode } from "./catalog-filters";
import { useCatalogNavigation } from "./catalog-navigation";

/** Conteo de resultados, orden y (en móvil) botón de filtros. */
export function CatalogToolbar({
  total,
  facets,
  specFacets,
  categoryMode,
}: {
  total: number;
  facets: CatalogFacets;
  specFacets: SpecFacet[];
  categoryMode: CategoryFilterMode;
}) {
  const { filters, update } = useCatalogNavigation();
  const [open, setOpen] = useState(false);
  const activeCount =
    filters.brands.length +
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    Object.values(filters.specs).reduce((sum, values) => sum + values.length, 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        <span className="font-semibold text-foreground tabular-nums">{total}</span>{" "}
        {total === 1 ? "producto" : "productos"}
      </p>
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="sm" className="lg:hidden">
              <SlidersHorizontalIcon aria-hidden />
              Filtros
              {hasActiveFilters(filters) && (
                <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] text-primary-foreground tabular-nums">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="font-heading font-stretch-112%">Filtros</SheetTitle>
              <SheetDescription>{total} productos coinciden.</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto p-4">
              <CatalogFilters
                facets={facets}
                specFacets={specFacets}
                categoryMode={categoryMode}
                idPrefix="movil"
              />
            </div>
          </SheetContent>
        </Sheet>

        <label htmlFor="orden" className="sr-only">
          Ordenar por
        </label>
        <select
          id="orden"
          value={filters.sort}
          onChange={(event) => update({ sort: event.target.value as SortValue })}
          className="h-8 rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
