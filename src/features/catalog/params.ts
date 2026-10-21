import { z } from "zod";

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "newest", label: "Más recientes" },
  { value: "price_asc", label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "name", label: "Nombre (A–Z)" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/** Filtros del catálogo. En la URL usan nombres en español para enlaces legibles. */
export type CatalogFilters = {
  q: string | null;
  category: string | null;
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  onSale: boolean;
  sort: SortValue;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const slugList = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(item)),
  )
  .catch([]);

const price = z.coerce.number().int().min(0).max(1_000_000_000).nullable().catch(null);

const schema = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value || null)
    .nullable()
    .catch(null),
  categoria: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .nullable()
    .catch(null),
  marca: slugList,
  min: price,
  max: price,
  disponible: z
    .string()
    .transform((value) => value === "1")
    .catch(false),
  oferta: z
    .string()
    .transform((value) => value === "1")
    .catch(false),
  orden: z.enum(SORT_OPTIONS.map((option) => option.value)).catch("relevance"),
  pagina: z.coerce.number().int().min(1).max(500).catch(1),
});

/** Convierte los parámetros de la URL en filtros válidos; lo inválido se ignora. */
export function parseCatalogParams(params: RawSearchParams): CatalogFilters {
  const parsed = schema.parse({
    q: first(params.q) ?? null,
    categoria: first(params.categoria) ?? null,
    marca: first(params.marca) ?? "",
    min: first(params.min) || null,
    max: first(params.max) || null,
    disponible: first(params.disponible) ?? "",
    oferta: first(params.oferta) ?? "",
    orden: first(params.orden),
    pagina: first(params.pagina) ?? 1,
  });

  let minPrice = parsed.min;
  let maxPrice = parsed.max;
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    q: parsed.q,
    category: parsed.categoria,
    brands: [...new Set(parsed.marca)].sort(),
    minPrice,
    maxPrice,
    inStock: parsed.disponible,
    onSale: parsed.oferta,
    sort: parsed.orden,
    page: parsed.pagina,
  };
}

/**
 * Serializa filtros a query string omitiendo los valores por defecto.
 * `overrides` permite construir enlaces (p. ej. cambiar de página o quitar un filtro).
 */
export function buildCatalogQuery(
  filters: CatalogFilters,
  overrides: Partial<CatalogFilters> = {},
): string {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("categoria", next.category);
  if (next.brands.length) params.set("marca", [...next.brands].sort().join(","));
  if (next.minPrice !== null) params.set("min", String(next.minPrice));
  if (next.maxPrice !== null) params.set("max", String(next.maxPrice));
  if (next.inStock) params.set("disponible", "1");
  if (next.onSale) params.set("oferta", "1");
  if (next.sort !== "relevance") params.set("orden", next.sort);
  if (next.page > 1) params.set("pagina", String(next.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.brands.length > 0 ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.inStock ||
    filters.onSale
  );
}

export const EMPTY_FILTERS: CatalogFilters = {
  q: null,
  category: null,
  brands: [],
  minPrice: null,
  maxPrice: null,
  inStock: false,
  onSale: false,
  sort: "relevance",
  page: 1,
};
