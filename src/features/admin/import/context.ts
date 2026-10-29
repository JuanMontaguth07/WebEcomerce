import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { ExistingProduct, ImportContext, SpecDefinition } from "./plan";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const PAGE = 1000;
const MAX_ROWS = 20_000;

/** Recorre una tabla de mil en mil (la API no devuelve más por consulta). */
export async function allRows<T>(
  fetchRange: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await fetchRange(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const PRODUCT_FIELDS =
  "id, name, slug, sku, product_type, category_id, brand_id, rarity_id, flag_id, unique_note, price, compare_at_price, low_stock_threshold, warranty_months, short_description, description, is_active, is_featured, seo_title, seo_description, stock";

/** Lo que la importación compara: categorías, marcas, productos con su ficha y especificaciones. */
export async function loadImportContext(supabase: Supabase): Promise<ImportContext> {
  const [categories, brands, specs, products, values] = await Promise.all([
    supabase.from("categories").select("id, name, slug"),
    supabase.from("brands").select("id, name, slug"),
    supabase.from("spec_definitions").select("id, category_id, key, label, data_type"),
    allRows((from, to) =>
      supabase.from("products").select(PRODUCT_FIELDS).order("id").range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("product_specs")
        .select("product_id, spec_id, value_text, value_number, value_boolean")
        .order("product_id")
        .order("spec_id")
        .range(from, to),
    ),
  ]);
  if (categories.error) throw categories.error;
  if (brands.error) throw brands.error;
  if (specs.error) throw specs.error;

  const specsByProduct = new Map<string, Record<string, string>>();
  for (const row of values) {
    const value = row.value_text ?? (row.value_number ?? row.value_boolean)?.toString();
    if (value === undefined) continue;
    const current = specsByProduct.get(row.product_id) ?? {};
    current[row.spec_id] = value;
    specsByProduct.set(row.product_id, current);
  }

  return {
    categories: categories.data,
    brands: brands.data,
    specs: specs.data.map((spec): SpecDefinition => ({
      id: spec.id,
      categoryId: spec.category_id,
      key: spec.key,
      label: spec.label,
      dataType: spec.data_type,
    })),
    products: products.map((row): ExistingProduct => ({
      id: row.id,
      stock: row.stock,
      specs: specsByProduct.get(row.id) ?? {},
      values: {
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        productType: row.product_type,
        categoryId: row.category_id,
        brandId: row.brand_id,
        rarityId: row.rarity_id,
        flagId: row.flag_id,
        uniqueNote: row.unique_note,
        price: Number(row.price),
        compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
        lowStockThreshold: row.low_stock_threshold,
        warrantyMonths: row.warranty_months,
        shortDescription: row.short_description,
        description: row.description,
        isActive: row.is_active,
        isFeatured: row.is_featured,
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
      },
    })),
  };
}
