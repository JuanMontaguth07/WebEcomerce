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

// Validación a mano (sin zod): este módulo también lo usan los filtros del
// navegador y así no se envía la librería de validación en cada página.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SORT_VALUES: readonly string[] = SORT_OPTIONS.map((option) => option.value);

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Entero dentro de [min, max] o null; acepta espacios alrededor, no decimales. */
function integerInRange(value: string | undefined, min: number, max: number): number | null {
  const text = value?.trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

/** Convierte los parámetros de la URL en filtros válidos; lo inválido se ignora. */
export function parseCatalogParams(params: RawSearchParams): CatalogFilters {
  const q = first(params.q)?.trim() ?? "";
  const category = first(params.categoria) ?? "";
  const brands = (first(params.marca) ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => SLUG.test(item));
  const sort = first(params.orden) ?? "";

  let minPrice = integerInRange(first(params.min), 0, 1_000_000_000);
  let maxPrice = integerInRange(first(params.max), 0, 1_000_000_000);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    q: q && q.length <= 80 ? q : null,
    category: SLUG.test(category) ? category : null,
    brands: [...new Set(brands)].sort(),
    minPrice,
    maxPrice,
    inStock: first(params.disponible) === "1",
    onSale: first(params.oferta) === "1",
    sort: SORT_VALUES.includes(sort) ? (sort as SortValue) : "relevance",
    page: integerInRange(first(params.pagina), 1, 500) ?? 1,
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
