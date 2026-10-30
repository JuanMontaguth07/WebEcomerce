import "server-only";
import { csvDate, toCsv, type CsvValue } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import type { listProductsForExport } from "../catalog";
import { PRODUCT_COLUMNS, PRODUCT_TYPE_LABELS, READ_ONLY_HEADERS, SPEC_PREFIX } from "./columns";

type ExportProduct = Awaited<ReturnType<typeof listProductsForExport>>[number];

/** Especificaciones de todas las categorías, una columna por nombre («Ficha: Núcleos»). */
async function specColumns() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spec_definitions")
    .select("id, label, data_type, position")
    .order("position")
    .order("label");
  if (error) throw error;
  const labels = [...new Set(data.map((spec) => spec.label))];
  return { labels, byId: new Map(data.map((spec) => [spec.id, spec])) };
}

/**
 * CSV de productos con las columnas que la importación entiende (y las de
 * referencia al final, que se ignoran al volver a subirlo). Sin productos es la
 * plantilla para empezar.
 */
export async function productsCsv(products: ExportProduct[]): Promise<string> {
  const { labels, byId } = await specColumns();
  const headers = [
    ...PRODUCT_COLUMNS.map((column) => column.header),
    ...labels.map((label) => `${SPEC_PREFIX}${label}`),
    ...READ_ONLY_HEADERS,
  ];
  const rows = products.map((product) => {
    const specs = new Map<string, CsvValue>();
    for (const value of product.specs) {
      const spec = byId.get(value.spec_id);
      if (!spec) continue;
      specs.set(spec.label, value.value_text ?? value.value_number ?? value.value_boolean);
    }
    const byField: Record<(typeof PRODUCT_COLUMNS)[number]["field"], CsvValue> = {
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      productType: PRODUCT_TYPE_LABELS[product.product_type],
      category: product.category?.name,
      brand: product.brand?.name,
      price: Number(product.price),
      compareAtPrice: product.compare_at_price === null ? null : Number(product.compare_at_price),
      stock: product.stock,
      lowStockThreshold: product.low_stock_threshold,
      warrantyMonths: product.warranty_months,
      isActive: product.is_active,
      isFeatured: product.is_featured,
      isReference: product.is_reference,
      shortDescription: product.short_description,
      description: product.description,
      seoTitle: product.seo_title,
      seoDescription: product.seo_description,
    };
    return [
      ...PRODUCT_COLUMNS.map((column) => byField[column.field]),
      ...labels.map((label) => specs.get(label)),
      product.stock * Number(product.price),
      csvDate(product.updated_at),
    ];
  });
  return toCsv(headers, rows);
}
