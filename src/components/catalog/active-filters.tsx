import { XIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  buildCatalogQuery,
  catalogHref,
  toggleSpec,
  type CatalogFilters,
} from "@/features/catalog/params";
import type { CatalogFacets, CategoryRef, SpecFacet } from "@/features/catalog/types";
import { formatCOP } from "@/lib/format";

type Chip = { key: string; label: string; changes: Partial<CatalogFilters> };

/** Filtros aplicados como etiquetas que se pueden quitar una a una. */
export function ActiveFilters({
  filters,
  basePath,
  facets,
  specFacets = [],
  categories = [],
}: {
  filters: CatalogFilters;
  basePath: string;
  facets: CatalogFacets;
  specFacets?: SpecFacet[];
  categories?: CategoryRef[];
}) {
  const brandName = (slug: string) => facets.brands.find((b) => b.slug === slug)?.name ?? slug;
  const chips: Chip[] = [];

  // La categoría solo es un filtro removible donde se filtra por parámetro (búsqueda, marcas).
  if (filters.category && categories.length) {
    const name = categories.find((c) => c.slug === filters.category)?.name ?? filters.category;
    chips.push({ key: "category", label: name, changes: { category: null } });
  }
  for (const slug of filters.brands) {
    chips.push({
      key: `brand-${slug}`,
      label: brandName(slug),
      changes: { brands: filters.brands.filter((b) => b !== slug) },
    });
  }
  for (const [key, values] of Object.entries(filters.specs)) {
    const facet = specFacets.find((item) => item.key === key);
    for (const value of values) {
      const label = facet?.values.find((item) => item.value === value)?.label ?? value;
      chips.push({
        key: `spec-${key}-${value}`,
        label: facet ? `${facet.label}: ${label}` : label,
        changes: { specs: toggleSpec(filters.specs, key, value, false) },
      });
    }
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const label =
      filters.minPrice !== null && filters.maxPrice !== null
        ? `${formatCOP(filters.minPrice)} – ${formatCOP(filters.maxPrice)}`
        : filters.minPrice !== null
          ? `Desde ${formatCOP(filters.minPrice)}`
          : `Hasta ${formatCOP(filters.maxPrice ?? 0)}`;
    chips.push({ key: "price", label, changes: { minPrice: null, maxPrice: null } });
  }
  if (filters.inStock)
    chips.push({ key: "stock", label: "Disponibles", changes: { inStock: false } });
  if (filters.onSale) chips.push({ key: "sale", label: "Ofertas", changes: { onSale: false } });

  if (!chips.length) return null;

  const clearAll = buildCatalogQuery({
    ...filters,
    category: null,
    brands: [],
    minPrice: null,
    maxPrice: null,
    inStock: false,
    onSale: false,
    specs: {},
    page: 1,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Filtros aplicados:</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={catalogHref(basePath, filters, { page: 1, ...chip.changes }) as Route}
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pr-2 pl-3 text-xs font-medium transition-colors hover:border-input"
        >
          {chip.label}
          <XIcon className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="sr-only">(quitar filtro)</span>
        </Link>
      ))}
      <Link
        href={`${basePath}${clearAll}` as Route}
        scroll={false}
        className="text-xs font-semibold text-primary hover:underline"
      >
        Limpiar filtros
      </Link>
    </div>
  );
}
