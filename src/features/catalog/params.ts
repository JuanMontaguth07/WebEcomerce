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
  /**
   * Especificaciones filtradas: clave de la ficha → valores elegidos, en
   * minúsculas (como los compara la base). En la URL: `?f_vram=12&f_vram=16`.
   */
  specs: Record<string, string[]>;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

// Validación a mano (sin zod): este módulo también lo usan los filtros del
// navegador y así no se envía la librería de validación en cada página.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SORT_VALUES: readonly string[] = SORT_OPTIONS.map((option) => option.value);

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const all = (value: string | string[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/** Prefijo de los parámetros de especificación y límites para no abusar de la URL. */
const SPEC_PREFIX = "f_";
const SPEC_KEY = /^[a-z][a-z0-9_]{0,49}$/;
const MAX_SPEC_KEYS = 8;
const MAX_SPEC_VALUES = 12;

/** Lee los `f_<clave>` de la URL: claves válidas, valores recortados y sin repetir. */
function parseSpecs(params: RawSearchParams): Record<string, string[]> {
  const specs: Record<string, string[]> = {};
  const keys = Object.keys(params)
    .filter((name) => name.startsWith(SPEC_PREFIX))
    .map((name) => name.slice(SPEC_PREFIX.length))
    .filter((key) => SPEC_KEY.test(key))
    .sort()
    .slice(0, MAX_SPEC_KEYS);
  for (const key of keys) {
    const values = all(params[SPEC_PREFIX + key])
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0 && value.length <= 80);
    const unique = [...new Set(values)].sort().slice(0, MAX_SPEC_VALUES);
    if (unique.length) specs[key] = unique;
  }
  return specs;
}

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
    specs: parseSpecs(params),
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
  for (const key of Object.keys(next.specs).sort()) {
    for (const value of [...(next.specs[key] ?? [])].sort())
      params.append(SPEC_PREFIX + key, value);
  }
  if (next.sort !== "relevance") params.set("orden", next.sort);
  if (next.page > 1) params.set("pagina", String(next.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Enlace del catálogo con sus filtros. En la página de una categoría la
 * categoría ya va en la ruta (/categorias/…): no se repite como ?categoria=.
 */
export function catalogHref(
  basePath: string,
  filters: CatalogFilters,
  overrides: Partial<CatalogFilters> = {},
): string {
  const categoryInPath = basePath.startsWith("/categorias/");
  return `${basePath}${buildCatalogQuery(filters, categoryInPath ? { ...overrides, category: null } : overrides)}`;
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.brands.length > 0 ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.inStock ||
    filters.onSale ||
    Object.keys(filters.specs).length > 0
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
  specs: {},
};

/** Agrega o quita un valor de una especificación filtrada. */
export function toggleSpec(
  specs: Record<string, string[]>,
  key: string,
  value: string,
  checked: boolean,
): Record<string, string[]> {
  const current = specs[key] ?? [];
  const values = checked
    ? [...new Set([...current, value])].sort()
    : current.filter((item) => item !== value);
  const next = { ...specs };
  if (values.length) next[key] = values;
  else delete next[key];
  return next;
}
