import "server-only";
import { architectKeys } from "@/features/compatibility/template";
import { PART_KINDS, type PartKind } from "@/features/compatibility/types";
import { createClient } from "@/lib/supabase/server";
import { allRows } from "./import/context";
import { assessProduct, QUALITY_CHECKS, type QualityCheck } from "./quality";

export type QualityProduct = {
  id: string;
  name: string;
  sku: string;
  isActive: boolean;
  image: string | null;
  score: number;
  issues: QualityCheck[];
};

export type CatalogQuality = {
  products: QualityProduct[];
  /** Cuántos productos tienen cada pendiente. */
  counts: Record<QualityCheck, number>;
  average: number;
  perfect: number;
};

const isPart = (value: string | null): value is PartKind =>
  value !== null && (PART_KINDS as readonly string[]).includes(value);

/** Revisa todo el catálogo (lo peor primero). */
export async function getCatalogQuality(): Promise<CatalogQuality> {
  const supabase = await createClient();
  const [specs, categories, products] = await Promise.all([
    supabase.from("spec_definitions").select("id, category_id, key, show_on_card"),
    supabase.from("categories").select("id, architect_part"),
    allRows((from, to) =>
      supabase
        .from("products")
        .select(
          `id, name, sku, price, stock, is_active, brand_id, warranty_months, short_description,
           description, category_id, images:product_images(storage_path, alt_text, position),
           specs:product_specs(spec_id)`,
        )
        .order("name")
        .order("id")
        .range(from, to),
    ),
  ]);
  if (specs.error) throw specs.error;
  if (categories.error) throw categories.error;

  const specsByCategory = new Map<string, { id: string; key: string; showOnCard: boolean }[]>();
  for (const spec of specs.data) {
    const list = specsByCategory.get(spec.category_id) ?? [];
    list.push({ id: spec.id, key: spec.key, showOnCard: spec.show_on_card });
    specsByCategory.set(spec.category_id, list);
  }
  const keysByCategory = new Map(
    categories.data.map((category) => [
      category.id,
      isPart(category.architect_part) ? architectKeys(category.architect_part) : new Set<string>(),
    ]),
  );

  const assessed = products.map((product): QualityProduct => {
    const images = [...product.images].sort((a, b) => a.position - b.position);
    const result = assessProduct({
      price: Number(product.price),
      stock: product.stock,
      isActive: product.is_active,
      brandId: product.brand_id,
      warrantyMonths: product.warranty_months,
      shortDescription: product.short_description,
      description: product.description,
      images: images.map((image) => ({ alt: image.alt_text })),
      filledSpecs: new Set(product.specs.map((spec) => spec.spec_id)),
      categorySpecs: specsByCategory.get(product.category_id) ?? [],
      architectKeys: keysByCategory.get(product.category_id) ?? new Set(),
    });
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      isActive: product.is_active,
      image: images[0]?.storage_path ?? null,
      ...result,
    };
  });

  const counts = Object.fromEntries(
    Object.keys(QUALITY_CHECKS).map((check) => [
      check,
      assessed.filter((product) => product.issues.includes(check as QualityCheck)).length,
    ]),
  ) as Record<QualityCheck, number>;

  return {
    products: assessed.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "es")),
    counts,
    average: assessed.length
      ? Math.round(assessed.reduce((sum, product) => sum + product.score, 0) / assessed.length)
      : 100,
    perfect: assessed.filter((product) => !product.issues.length).length,
  };
}
