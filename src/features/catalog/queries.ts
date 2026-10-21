import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { PAGE_SIZE, type CatalogFilters } from "./params";
import { toProductSpecs } from "./specs";
import type {
  Brand,
  CatalogFacets,
  Category,
  ProductDetail,
  ProductSummary,
  ProductType,
} from "./types";

/**
 * Lecturas públicas del catálogo. Todas usan el cliente anónimo (RLS: solo lo
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
  stock, low_stock_threshold,
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
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string };
  images: { storage_path: string; alt_text: string; position: number }[];
};

function toSummary(row: SummaryRow): ProductSummary {
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
  };
}

function fail(context: string, error: { message: string }): never {
  throw new Error(`[catalog] ${context}: ${error.message}`);
}

// -----------------------------------------------------------------------------
// Categorías y marcas
// -----------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.categories);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, parent_id, name, slug, description, seo_title, seo_description")
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
  }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getBrands(): Promise<Brand[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.brands);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("brands")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("name");
  if (error) fail("getBrands", error);
  return data;
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
  const { data, error } = await createPublicClient().rpc("catalog_search", {
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
  });
  if (error) fail("searchCatalog", error);

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
  }));

  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getCatalogFacets(
  filters: Pick<CatalogFilters, "q" | "category" | "inStock" | "onSale">,
  scope: CatalogScope = {},
): Promise<CatalogFacets> {
  "use cache";
  cacheTag(CATALOG_TAGS.products, CATALOG_TAGS.brands);
  cacheLife("minutes");

  const { data, error } = await createPublicClient().rpc("catalog_facets", {
    p_query: filters.q ?? undefined,
    p_category: filters.category ?? undefined,
    p_in_stock: filters.inStock,
    p_on_sale: filters.onSale,
    p_product_type: scope.productType,
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
  cacheLife("hours");

  let query = createPublicClient()
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
  const items = data.map(toSummary);
  return [...items.filter((p) => p.stock > 0), ...items.filter((p) => p.stock <= 0)];
}

/** Más vendidos según pedidos reales. Sin ventas devuelve una lista vacía. */
export async function getBestSellers(limit = 8): Promise<ProductSummary[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("hours");

  const client = createPublicClient();
  const { data: ranking, error } = await client.rpc("best_selling_products", { p_limit: limit });
  if (error) fail("getBestSellers", error);
  if (!ranking.length) return [];

  const ids = ranking.map((row) => row.product_id);
  const { data, error: productsError } = await client
    .from("products")
    .select(SUMMARY_SELECT)
    .in("id", ids)
    .overrideTypes<SummaryRow[], { merge: false }>();
  if (productsError) fail("getBestSellers", productsError);

  const byId = new Map(data.map((row) => [row.id, toSummary(row)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

// -----------------------------------------------------------------------------
// Ficha de producto
// -----------------------------------------------------------------------------

type DetailRow = SummaryRow & {
  description: string | null;
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
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("products")
    .select(
      `
      id, name, slug, sku, product_type, short_description, description, price, compare_at_price,
      stock, low_stock_threshold, warranty_months, seo_title, seo_description, updated_at,
      brand:brands(name, slug),
      category:categories!inner(id, name, slug, parent_id),
      images:product_images(id, storage_path, alt_text, position, width, height),
      specs:product_specs(
        value_text, value_number, value_boolean,
        definition:spec_definitions(key, label, group_label, unit, data_type, position)
      )
    `,
    )
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<DetailRow, { merge: false }>();
  if (error) fail("getProductBySlug", error);
  if (!data) return null;

  const images = [...data.images].sort((a, b) => a.position - b.position);
  // El padre se resuelve con la lista de categorías (ya cacheada): el embed de una
  // relación de la tabla consigo misma es ambiguo en PostgREST.
  const parent = data.category.parent_id
    ? (await getCategories()).find((category) => category.id === data.category.parent_id)
    : undefined;
  return {
    ...toSummary(data),
    description: data.description,
    warrantyMonths: data.warranty_months,
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

export async function getRelatedProducts(
  product: Pick<ProductSummary, "id" | "category">,
  limit = 4,
): Promise<ProductSummary[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("products")
    .select(SUMMARY_SELECT)
    .eq("is_active", true)
    .eq("category.slug", product.category.slug)
    .neq("id", product.id)
    .gt("stock", 0)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" })
    .limit(limit)
    .overrideTypes<SummaryRow[], { merge: false }>();
  if (error) fail("getRelatedProducts", error);
  return data.map(toSummary);
}

export async function getActiveProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
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

  const { data, error } = await createPublicClient().rpc("search_suggestions", {
    p_query: query,
    p_limit: 6,
  });
  if (error) fail("getSearchSuggestions", error);
  return data as SearchSuggestions;
}
