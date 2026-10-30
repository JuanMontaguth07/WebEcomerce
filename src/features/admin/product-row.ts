import type { ProductValues } from "./catalog-schemas";

/** Valores del formulario (o de la importación) a columnas de `products`. El stock va aparte. */
export function toProductRow(values: ProductValues) {
  return {
    name: values.name,
    slug: values.slug,
    sku: values.sku,
    product_type: values.productType,
    category_id: values.categoryId,
    brand_id: values.brandId ?? null,
    rarity_id: values.rarityId ?? null,
    flag_id: values.flagId ?? null,
    unique_note: values.uniqueNote ?? null,
    price: values.price,
    compare_at_price: values.compareAtPrice ?? null,
    low_stock_threshold: values.lowStockThreshold,
    warranty_months: values.warrantyMonths ?? null,
    short_description: values.shortDescription ?? null,
    description: values.description ?? null,
    is_active: values.isActive,
    is_featured: values.isFeatured,
    is_reference: values.isReference,
    seo_title: values.seoTitle ?? null,
    seo_description: values.seoDescription ?? null,
  };
}
