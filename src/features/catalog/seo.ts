import type { Metadata } from "next";
import { baseOpenGraph } from "@/lib/seo";
import { hasActiveFilters, parseCatalogParams, type RawSearchParams } from "./params";

/**
 * Metadata de listados: la URL canónica es la página limpia (solo conserva la
 * paginación) y las combinaciones de filtros no se indexan, para evitar
 * contenido duplicado.
 */
export function listingMetadata(
  path: string,
  searchParams: RawSearchParams,
  base: Pick<Metadata, "title" | "description">,
): Metadata {
  const filters = parseCatalogParams(searchParams);
  const filtered = hasActiveFilters(filters) || filters.sort !== "relevance" || Boolean(filters.q);
  const canonical = filters.page > 1 ? `${path}?pagina=${filters.page}` : path;

  return {
    ...base,
    alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: {
      ...baseOpenGraph,
      title: typeof base.title === "string" ? base.title : undefined,
      description: base.description ?? undefined,
      url: canonical,
    },
  };
}
