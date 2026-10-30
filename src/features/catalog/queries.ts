import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getFlagMap } from "@/features/flags/queries";
import type { ProductFlag } from "@/features/flags/types";
import { getRarityMap } from "@/features/rarities/queries";
import type { Rarity } from "@/features/rarities/types";
import { asPartKind } from "@/features/compatibility/types";
import { createPublicClient } from "@/lib/supabase/public";
import { PAGE_SIZE, type CatalogFilters } from "./params";
import { formatSpecValue, toCardSpecs, toProductSpecs, type RawSpec } from "./specs";
import type {
  Brand,
  CatalogFacets,
  Category,
  ProductDetail,
  ProductSummary,
  ProductType,
  SpecDataType,
  SpecFacet,
} from "./types";

/**
 * Lecturas públicas del catálogo.
 * Todo lo que muestra stock usa el perfil "minutes": los pedidos que vencen
 * se cancelan dentro de la base de datos (pg_cron) y no pueden invalidar la
 * caché de Next. Categorías y marcas, que no cambian con los pedidos, usan "hours".
 * Todas usan el cliente anónimo (RLS: solo lo
 * activo) y se cachean con etiquetas que el panel invalida al editar:
 *   products · product:<slug> · categories · brands
 */

export const CATALOG_TAGS = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  brands: "brands",
} as const;

const SUMMARY_SELECT = `
  id, name, slug, sku, product_type, short_description, price, compare_at_price,
  stock, low_stock_threshold, rarity_id, flag_id,
  brand:brands(name, slug),
  category:categories!inner(name, slug),
  images:product_images(storage_path, alt_text, position)
`;

type SummaryRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  product_type: ProductType;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  low_stock_threshold: number;
  rarity_id: string | null;
  flag_id: string | null;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string };
  images: { storage_path: string; alt_text: string; position: number }[];
};

/** Rarezas y banderas activas (cacheadas) para completar las tarjetas. */
type Lookups = { rarities: Map<string, Rarity>; flags: Map<string, ProductFlag> };

async function getLookups(): Promise<Lookups> {
  const [rarities, flags] = await Promise.all([getRarityMap(), getFlagMap()]);
  return { rarities, flags };
}

function decorate(
  row: { rarity_id: string | null; flag_id: string | null },
  { rarities, flags }: Lookups,
) {
  return {
    rarity: (row.rarity_id && rarities.get(row.rarity_id)) || null,
    flag: (row.flag_id && flags.get(row.flag_id)) || null,
  };
}

function toSummary(row: SummaryRow, lookups: Lookups): ProductSummary {
  const image = [...row.images].sort((a, b) => a.position - b.position)[0];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    productType: row.product_type,
    shortDescription: row.short_description,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    brand: row.brand,
    category: row.category,
    image: image ? { path: image.storage_path, alt: image.alt_text } : null,
    ...decorate(row, lookups),
    warrantyMonths: null,
    keySpecs: [],
  };
}

type CardSpecRow = RawSpec & { product_id: string };

/**
 * Completa un listado con la garantía y las especificaciones marcadas «en la
 * tarjeta». Dos consultas por listado, sin importar cuántos productos tenga.
 */
async function withCardDetails(items: ProductSummary[]): Promise<ProductSummary[]> {
  if (!items.length) return items;
  const client = createPublicClient({ retry: true });
  const ids = items.map((item) => item.id);
  const [warranties, specs] = await Promise.all([
    client.from("products").select("id, warranty_months").in("id", ids),
    client
      .from("product_specs")
      .select(
        `product_id, value_text, value_number, value_boolean,
         definition:spec_definitions!inner(key, label, group_label, unit, data_type, position)`,
      )
      .in("product_id", ids)
      .eq("definition.show_on_card", true)
      .overrideTypes<CardSpecRow[], { merge: false }>(),
  ]);
  if (warranties.error) fail("withCardDetails", warranties.error);
  if (specs.error) fail("withCardDetails", specs.error);

  const warranty = new Map(warranties.data.map((row) => [row.id, row.warranty_months]));
  const byProduct = new Map<string, CardSpecRow[]>();
  for (const row of specs.data) {
    byProduct.set(row.product_id, [...(byProduct.get(row.product_id) ?? []), row]);
  }
  return items.map((item) => ({
    ...item,
    warrantyMonths: warranty.get(item.id) ?? null,
    keySpecs: toCardSpecs(byProduct.get(item.id) ?? []),
  }));
}

function fail(context: string, error: { message: string }): never {
  // Si Supabase está caído, la respuesta puede ser una página HTML completa:
  // se resume para no llenar los registros.
  const message = error.message.trimStart().startsWith("<")
    ? "respuesta no válida de Supabase (posible caída temporal)"
    : error.message.slice(0, 300);
  throw new Error(`[catalog] ${context}: ${message}`);
}

// -----------------------------------------------------------------------------
// Categorías y marcas
// -----------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.categories);
  cacheLife("hours");

  const { data, error } = await createPublicClient({ retry: true })
    .from("categories")
    .select(
      "id, parent_id, name, slug, description, seo_title, seo_description, image_path, architect_part",
    )
    .eq("is_active", true)
    .order("position")
    .order("name");
  if (error) fail("getCategories", error);

  return data.map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    imagePath: row.image_path,
    architectPart: asPartKind(row.architect_part),
  }));
}

/** Productos visibles por categoría principal (incluye sus subcategorías). */
export async function getCategoryProductCounts(): Promise<Record<string, number>> {
  "use cache";
  cacheTag(CATALOG_TAGS.products, CATALOG_TAGS.categories);
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true }).rpc("category_product_counts");
  if (error) fail("getCategoryProductCounts", error);
  return Object.fromEntries(data.map((row) => [row.category_id, row.product_count]));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getBrands(): Promise<Brand[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.brands);
  cacheLife("hours");

  const { data, error } = await createPublicClient({ retry: true })
    .from("brands")
    .select("id, name, slug, description, logo_path")
    .eq("is_active", true)
    .order("name");
  if (error) fail("getBrands", error);
  return data.map(({ logo_path, ...brand }) => ({ ...brand, logoPath: logo_path }));
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const brands = await getBrands();
  return brands.find((brand) => brand.slug === slug) ?? null;
}

// -----------------------------------------------------------------------------
// Listado con filtros
// -----------------------------------------------------------------------------

export type CatalogScope = { productType?: ProductType; brand?: string };

export async function searchCatalog(
  filters: CatalogFilters,
  scope: CatalogScope = {},
): Promise<{ items: ProductSummary[]; total: number; pageCount: number }> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("minutes");

  const brands = scope.brand ? [scope.brand] : filters.brands;
  const { data, error } = await createPublicClient({ retry: true }).rpc("catalog_search", {
    p_query: filters.q ?? undefined,
    p_category: filters.category ?? undefined,
    p_brands: brands.length ? brands : undefined,
    p_min_price: filters.minPrice ?? undefined,
    p_max_price: filters.maxPrice ?? undefined,
    p_in_stock: filters.inStock,
    p_on_sale: filters.onSale,
    p_product_type: scope.productType,
    p_sort: filters.sort,
    p_limit: PAGE_SIZE,
    p_offset: (filters.page - 1) * PAGE_SIZE,
    p_specs: Object.keys(filters.specs).length ? filters.specs : undefined,
  });
  if (error) fail("searchCatalog", error);

  const lookups = await getLookups();
  const total = Number(data[0]?.total_count ?? 0);
  const items = data.map((row): ProductSummary => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    productType: row.product_type,
    shortDescription: row.short_description,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    brand: row.brand_slug ? { name: row.brand_name, slug: row.brand_slug } : null,
    category: { name: row.category_name, slug: row.category_slug },
    image: row.image_path ? { path: row.image_path, alt: row.image_alt } : null,
    ...decorate(row, lookups),
    warrantyMonths: null,
    keySpecs: [],
  }));

  return {
    items: await withCardDetails(items),
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getCatalogFacets(
  filters: Pick<CatalogFilters, "q" | "category" | "inStock" | "onSale" | "specs">,
  scope: CatalogScope = {},
): Promise<CatalogFacets> {
  "use cache";
  cacheTag(CATALOG_TAGS.products, CATALOG_TAGS.brands);
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true }).rpc("catalog_facets", {
    p_query: filters.q ?? undefined,
    p_category: filters.category ?? undefined,
    p_in_stock: filters.inStock,
    p_on_sale: filters.onSale,
    p_product_type: scope.productType,
    p_specs: Object.keys(filters.specs).length ? filters.specs : undefined,
  });
  if (error) fail("getCatalogFacets", error);

  const facets = data as {
    total: number;
    min_price: number | null;
    max_price: number | null;
    brands: CatalogFacets["brands"];
  };
  return {
    total: facets.total,
    minPrice: facets.min_price,
    maxPrice: facets.max_price,
    brands: facets.brands,
  };
}

type SpecFacetRow = {
  key: string;
  label: string;
  unit: string | null;
  data_type: SpecDataType;
  values: { value: string; label: string | null; count: number }[];
};

/**
 * Especificaciones filtrables de la categoría con sus valores y conteos (cada
 * uno aplica los demás filtros). Solo dentro de una categoría: las fichas
 * cambian de una a otra.
 */
export async function getSpecFacets(
  filters: Omit<CatalogFilters, "sort" | "page">,
  scope: CatalogScope = {},
): Promise<SpecFacet[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products, CATALOG_TAGS.categories);
  cacheLife("minutes");

  if (!filters.category) return [];
  const { data, error } = await createPublicClient({ retry: true }).rpc("catalog_spec_facets", {
    p_query: filters.q ?? undefined,
    p_category: filters.category,
    p_brands: filters.brands.length ? filters.brands : undefined,
    p_min_price: filters.minPrice ?? undefined,
    p_max_price: filters.maxPrice ?? undefined,
    p_in_stock: filters.inStock,
    p_on_sale: filters.onSale,
    p_product_type: scope.productType,
    p_specs: Object.keys(filters.specs).length ? filters.specs : undefined,
  });
  if (error) fail("getSpecFacets", error);

  return (data as SpecFacetRow[]).map((facet) => ({
    key: facet.key,
    label: facet.label,
    values: facet.values.map((item) => ({
      value: item.value,
      count: item.count,
      label:
        facet.data_type === "text"
          ? (item.label ?? item.value)
          : formatSpecValue(
              facet.data_type,
              {
                text: null,
                number: facet.data_type === "number" ? Number(item.value) : null,
                boolean: facet.data_type === "boolean" ? item.value === "true" : null,
              },
              facet.unit,
            ),
    })),
  }));
}

// -----------------------------------------------------------------------------
// Secciones de la home
// -----------------------------------------------------------------------------

export type HomeCollection = "featured" | "deals" | "newest" | "prebuilt";

export async function getHomeCollection(
  collection: HomeCollection,
  limit = 8,
): Promise<ProductSummary[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("minutes");

  let query = createPublicClient({ retry: true })
    .from("products")
    .select(SUMMARY_SELECT)
    .eq("is_active", true)
    .order("position", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" });

  if (collection === "featured") query = query.eq("is_featured", true);
  if (collection === "deals") query = query.not("compare_at_price", "is", null);
  if (collection === "prebuilt") query = query.eq("product_type", "prebuilt");

  const { data, error } = await query
    .order("stock", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<SummaryRow[], { merge: false }>();
  if (error) fail(`getHomeCollection(${collection})`, error);

  // Los agotados van al final, pero siguen visibles.
  const lookups = await getLookups();
  const items = await withCardDetails(data.map((row) => toSummary(row, lookups)));
  return [...items.filter((p) => p.stock > 0), ...items.filter((p) => p.stock <= 0)];
}

export type UniqueProduct = { product: ProductSummary; note: string };

/** Piezas únicas: productos con la nota de por qué son especiales, más recientes primero. */
export async function getUniqueProducts(limit = 4): Promise<UniqueProduct[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true })
    .from("products")
    .select(`${SUMMARY_SELECT}, unique_note`)
    .eq("is_active", true)
    .not("unique_note", "is", null)
    .order("position", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" })
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<(SummaryRow & { unique_note: string })[], { merge: false }>();
  if (error) fail("getUniqueProducts", error);

  const lookups = await getLookups();
  const products = await withCardDetails(data.map((row) => toSummary(row, lookups)));
  return products.map((product, index) => ({ product, note: data[index]?.unique_note ?? "" }));
}

/** Más vendidos según pedidos reales. Sin ventas devuelve una lista vacía. */
export async function getBestSellers(limit = 8): Promise<ProductSummary[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("minutes");

  const client = createPublicClient({ retry: true });
  const { data: ranking, error } = await client.rpc("best_selling_products", { p_limit: limit });
  if (error) fail("getBestSellers", error);
  if (!ranking.length) return [];

  const ids = ranking.map((row) => row.product_id);
  const { data, error: productsError } = await client
    .from("products")
    .select(SUMMARY_SELECT)
    .in("id", ids)
    // Explícito: la RLS también deja leer piezas de referencia (no se venden).
    .eq("is_active", true)
    .overrideTypes<SummaryRow[], { merge: false }>();
  if (productsError) fail("getBestSellers", productsError);

  const lookups = await getLookups();
  const products = await withCardDetails(data.map((row) => toSummary(row, lookups)));
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

// -----------------------------------------------------------------------------
// Ficha de producto
// -----------------------------------------------------------------------------

type DetailRow = SummaryRow & {
  description: string | null;
  unique_note: string | null;
  warranty_months: number | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
  category: { id: string; name: string; slug: string; parent_id: string | null };
  images: {
    id: string;
    storage_path: string;
    alt_text: string;
    position: number;
    width: number | null;
    height: number | null;
  }[];
  specs: Parameters<typeof toProductSpecs>[0];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(CATALOG_TAGS.products, CATALOG_TAGS.product(slug));
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true })
    .from("products")
    .select(
      `
      id, name, slug, sku, product_type, short_description, description, price, compare_at_price,
      stock, low_stock_threshold, rarity_id, flag_id, unique_note, warranty_months, seo_title, seo_description, updated_at,
      brand:brands(name, slug),
      category:categories!inner(id, name, slug, parent_id),
      images:product_images(id, storage_path, alt_text, position, width, height),
      specs:product_specs(
        value_text, value_number, value_boolean,
        definition:spec_definitions(key, label, group_label, unit, data_type, position, show_on_card)
      )
    `,
    )
    .eq("slug", slug)
    // Explícito: la RLS también deja leer piezas de referencia (no se venden).
    .eq("is_active", true)
    .maybeSingle()
    .overrideTypes<DetailRow, { merge: false }>();
  if (error) fail("getProductBySlug", error);
  if (!data) return null;

  const images = [...data.images].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  // El padre se resuelve con la lista de categorías (ya cacheada): el embed de una
  // relación de la tabla consigo misma es ambiguo en PostgREST.
  const parent = data.category.parent_id
    ? (await getCategories()).find((category) => category.id === data.category.parent_id)
    : undefined;
  return {
    ...toSummary(data, await getLookups()),
    description: data.description,
    uniqueNote: data.unique_note,
    warrantyMonths: data.warranty_months,
    keySpecs: toCardSpecs(data.specs.filter((spec) => spec.definition?.show_on_card)),
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    updatedAt: data.updated_at,
    category: { name: data.category.name, slug: data.category.slug },
    parentCategory: parent ? { name: parent.name, slug: parent.slug } : null,
    images: images.map((image) => ({
      id: image.id,
      path: image.storage_path,
      alt: image.alt_text,
      width: image.width,
      height: image.height,
    })),
    specs: toProductSpecs(data.specs),
  };
}

/**
 * Recibe valores simples, no el producto: los argumentos forman la clave de la
 * caché y un objeto grande (con listas) puede variar entre consultas.
 */
export async function getRelatedProducts(
  productId: string,
  categorySlug: string,
  limit = 4,
): Promise<ProductSummary[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true })
    .from("products")
    .select(SUMMARY_SELECT)
    .eq("is_active", true)
    .eq("category.slug", categorySlug)
    .neq("id", productId)
    .gt("stock", 0)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" })
    .limit(limit)
    .overrideTypes<SummaryRow[], { merge: false }>();
  if (error) fail("getRelatedProducts", error);
  const lookups = await getLookups();
  return withCardDetails(data.map((row) => toSummary(row, lookups)));
}

export async function getActiveProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("hours");

  const { data, error } = await createPublicClient({ retry: true })
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (error) fail("getActiveProductSlugs", error);
  return data.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}

// -----------------------------------------------------------------------------
// Sugerencias del buscador
// -----------------------------------------------------------------------------

export type SearchSuggestions = {
  products: {
    name: string;
    slug: string;
    sku: string;
    price: number;
    brand_name: string | null;
    image_path: string | null;
  }[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
};

export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true }).rpc("search_suggestions", {
    p_query: query,
    p_limit: 6,
  });
  if (error) fail("getSearchSuggestions", error);
  return data as SearchSuggestions;
}
