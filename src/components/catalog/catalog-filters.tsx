"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildCatalogQuery } from "@/features/catalog/params";
import type { CatalogFacets, CategoryRef } from "@/features/catalog/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCatalogNavigation } from "./catalog-navigation";

export type CategoryFilterMode =
  /** Enlaza a /categorias/[slug] (páginas indexables). */
  | { type: "links"; categories: CategoryRef[]; current?: string }
  /** Filtra dentro de la misma página con ?categoria= (búsqueda). */
  | { type: "param"; categories: CategoryRef[] }
  | { type: "none" };

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3 border-b pb-5 last:border-b-0">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export function CatalogFilters({
  facets,
  categoryMode,
  idPrefix,
}: {
  facets: CatalogFacets;
  categoryMode: CategoryFilterMode;
  /** Distingue los ids cuando el panel aparece dos veces (escritorio y móvil). */
  idPrefix: string;
}) {
  const { filters, update } = useCatalogNavigation();

  const toggleBrand = (slug: string, checked: boolean) => {
    const brands = checked ? [...filters.brands, slug] : filters.brands.filter((b) => b !== slug);
    update({ brands });
  };

  // Para enlaces a otras categorías se conservan los filtros generales.
  const keep = buildCatalogQuery({
    ...filters,
    category: null,
    brands: [],
    minPrice: null,
    maxPrice: null,
    page: 1,
  });

  return (
    <div className="grid gap-5">
      {categoryMode.type !== "none" && categoryMode.categories.length > 0 && (
        <FilterGroup title="Categorías">
          <ul className="grid gap-0.5 text-sm">
            {categoryMode.categories.map((category) => {
              const active =
                categoryMode.type === "links"
                  ? categoryMode.current === category.slug
                  : filters.category === category.slug;
              const className = cn(
                "flex w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary",
                active && "bg-primary-soft font-semibold text-primary hover:bg-primary-soft",
              );
              return (
                <li key={category.slug}>
                  {categoryMode.type === "links" ? (
                    <Link
                      href={`/categorias/${category.slug}${keep}` as Route}
                      aria-current={active ? "page" : undefined}
                      className={className}
                    >
                      {category.name}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ category: active ? null : category.slug })}
                      className={className}
                    >
                      {category.name}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      )}

      <FilterGroup title="Disponibilidad">
        <div className="flex items-center gap-3">
          <Checkbox
            id={`${idPrefix}-stock`}
            checked={filters.inStock}
            onCheckedChange={(checked) => update({ inStock: checked === true })}
          />
          <Label htmlFor={`${idPrefix}-stock`} className="font-normal">
            Solo productos disponibles
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id={`${idPrefix}-sale`}
            checked={filters.onSale}
            onCheckedChange={(checked) => update({ onSale: checked === true })}
          />
          <Label htmlFor={`${idPrefix}-sale`} className="font-normal">
            Solo ofertas
          </Label>
        </div>
      </FilterGroup>

      {facets.brands.length > 0 && (
        <FilterGroup title="Marca">
          {facets.brands.map((brand) => (
            <div key={brand.slug} className="flex items-center gap-3">
              <Checkbox
                id={`${idPrefix}-brand-${brand.slug}`}
                checked={filters.brands.includes(brand.slug)}
                onCheckedChange={(checked) => toggleBrand(brand.slug, checked === true)}
              />
              <Label htmlFor={`${idPrefix}-brand-${brand.slug}`} className="flex-1 font-normal">
                {brand.name}
              </Label>
              <span className="text-xs text-muted-foreground tabular-nums">{brand.count}</span>
            </div>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Precio">
        {/* La clave reinicia los campos cuando el precio cambia desde la URL. */}
        <PriceFilter
          key={`${filters.minPrice}-${filters.maxPrice}`}
          facets={facets}
          idPrefix={idPrefix}
        />
      </FilterGroup>
    </div>
  );
}

function PriceFilter({ facets, idPrefix }: { facets: CatalogFacets; idPrefix: string }) {
  const { filters, update } = useCatalogNavigation();
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() ?? "");

  const applyPrice = (event: React.FormEvent) => {
    event.preventDefault();
    update({
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
    });
  };

  return (
    <form onSubmit={applyPrice} className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-min`} className="text-xs text-muted-foreground">
            Desde
          </Label>
          <Input
            id={`${idPrefix}-min`}
            inputMode="numeric"
            placeholder={facets.minPrice ? formatCOP(facets.minPrice) : "$ 0"}
            value={minPrice}
            onChange={(event) => setMinPrice(digitsOnly(event.target.value))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-max`} className="text-xs text-muted-foreground">
            Hasta
          </Label>
          <Input
            id={`${idPrefix}-max`}
            inputMode="numeric"
            placeholder={facets.maxPrice ? formatCOP(facets.maxPrice) : "Sin límite"}
            value={maxPrice}
            onChange={(event) => setMaxPrice(digitsOnly(event.target.value))}
          />
        </div>
      </div>
      <Button type="submit" variant="outline" size="sm">
        Aplicar precio
      </Button>
    </form>
  );
}
