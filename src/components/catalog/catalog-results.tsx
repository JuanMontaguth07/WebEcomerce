import { PackageSearchIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid, ProductGridSkeleton } from "@/components/shop/product-grid";
import {
  buildCatalogQuery,
  hasActiveFilters,
  parseCatalogParams,
  type CatalogFilters as Filters,
  type RawSearchParams,
} from "@/features/catalog/params";
import { getCatalogFacets, searchCatalog, type CatalogScope } from "@/features/catalog/queries";
import type { CategoryRef } from "@/features/catalog/types";
import { ActiveFilters } from "./active-filters";
import { CatalogFilters, type CategoryFilterMode } from "./catalog-filters";
import { CatalogNavigationProvider, CatalogPendingRegion } from "./catalog-navigation";
import { CatalogToolbar } from "./catalog-toolbar";
import { Pagination } from "./pagination";

type CatalogResultsProps = {
  searchParams: Promise<RawSearchParams>;
  basePath: string;
  /** Restricciones fijas de la página (categoría, marca o tipo). */
  fixed?: Partial<Pick<Filters, "category">>;
  scope?: CatalogScope;
  categoryMode: CategoryFilterMode;
};

function EmptyState({ filters, basePath }: { filters: Filters; basePath: string }) {
  const filtered = hasActiveFilters(filters);
  // Sin búsqueda ni filtros: la sección todavía no tiene productos publicados.
  const nothingYet = !filtered && !filters.q;
  return (
    <div className="grid justify-items-center gap-4 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <PackageSearchIcon className="size-10 text-muted-foreground" aria-hidden />
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">
          {nothingYet ? "Aún no hay productos aquí" : "No encontramos productos"}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {filters.q
            ? `No hay resultados para «${filters.q}» con los filtros actuales. Revisa la ortografía o prueba con el SKU.`
            : nothingYet
              ? "Estamos preparando el catálogo. Vuelve pronto."
              : "Ningún producto coincide con los filtros seleccionados."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {filtered && (
          <Button asChild variant="secondary">
            <Link
              href={
                `${basePath}${buildCatalogQuery({ ...filters, brands: [], minPrice: null, maxPrice: null, inStock: false, onSale: false, page: 1 })}` as Route
              }
            >
              Quitar filtros
            </Link>
          </Button>
        )}
        {/* En /productos sin filtros este enlace llevaría a la misma página. */}
        {basePath === "/productos" && nothingYet ? (
          <Button asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/productos">Ver todo el catálogo</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Lee la URL, consulta el catálogo y arma filtros, resultados y paginación. */
export async function CatalogResults({
  searchParams,
  basePath,
  fixed = {},
  scope = {},
  categoryMode,
}: CatalogResultsProps) {
  const filters: Filters = { ...parseCatalogParams(await searchParams), ...fixed };
  const [{ items, total, pageCount }, facets] = await Promise.all([
    searchCatalog(filters, scope),
    // Solo los campos que usa: los argumentos son la clave de la caché.
    getCatalogFacets(
      {
        q: filters.q,
        category: filters.category,
        inStock: filters.inStock,
        onSale: filters.onSale,
      },
      scope,
    ),
  ]);
  const categories: CategoryRef[] = categoryMode.type === "none" ? [] : categoryMode.categories;

  return (
    <CatalogNavigationProvider filters={filters} basePath={basePath}>
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] xl:grid-cols-[16.5rem_1fr]">
        <aside aria-label="Filtros" className="hidden lg:block">
          <div className="sticky top-32">
            <CatalogFilters facets={facets} categoryMode={categoryMode} idPrefix="escritorio" />
          </div>
        </aside>

        <div className="grid content-start gap-5">
          <CatalogToolbar total={total} facets={facets} categoryMode={categoryMode} />
          <ActiveFilters
            filters={filters}
            basePath={basePath}
            facets={facets}
            categories={categoryMode.type === "param" ? categories : []}
          />
          <CatalogPendingRegion className="grid gap-10">
            {items.length ? (
              <>
                {/* Las tarjetas usan h3: este h2 mantiene el orden de títulos. */}
                <h2 className="sr-only">Productos</h2>
                <ProductGrid
                  products={items}
                  priorityCount={filters.page === 1 ? 4 : 0}
                  animateChanges
                />
                <Pagination filters={filters} basePath={basePath} pageCount={pageCount} />
              </>
            ) : (
              <EmptyState filters={filters} basePath={basePath} />
            )}
          </CatalogPendingRegion>
        </div>
      </div>
    </CatalogNavigationProvider>
  );
}

export function CatalogResultsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr] xl:grid-cols-[16.5rem_1fr]">
      <div className="hidden gap-4 lg:grid lg:content-start" aria-hidden>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </div>
      <div className="grid content-start gap-5">
        <div className="flex justify-between" aria-hidden>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-36" />
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
