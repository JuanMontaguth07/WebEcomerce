import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CATALOG_TAGS } from "@/features/catalog/queries";
import type { RawSpec } from "@/features/catalog/specs";
import { asPartKind, type PartKind } from "@/features/compatibility/types";
import { toOffer } from "@/features/offers/mappers";
import { createPublicClient } from "@/lib/supabase/public";
import { describeSpecs } from "./parts";
import { SHARE_CODE, type SavedBuild } from "./saved";
import type { ArchitectPart } from "./types";

/** Tope de productos por consulta: alcanza para un catálogo de tienda propia. */
const MAX_PARTS = 600;

type PartRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  category_id: string;
  brand: { name: string } | null;
  is_reference: boolean;
  images: { storage_path: string; alt_text: string; position: number }[];
  specs: RawSpec[];
  offers: OfferRow[];
};

type OfferRow = Parameters<typeof toOffer>[0] & { position: number };

/**
 * Productos activos de las categorías que el admin marcó como pieza de Kova
 * Architect (una subcategoría sin pieza propia usa la de su principal), con la
 * ficha completa para comprobar la compatibilidad.
 */
export async function getArchitectParts(): Promise<ArchitectPart[]> {
  "use cache";
  cacheTag(CATALOG_TAGS.products, CATALOG_TAGS.categories);
  cacheLife("minutes");

  const client = createPublicClient({ retry: true });
  const { data: categories, error } = await client
    .from("categories")
    .select("id, parent_id, architect_part")
    .eq("is_active", true);
  if (error) throw new Error(`[architect] categorías: ${error.message.slice(0, 300)}`);

  const own = new Map(categories.map((row) => [row.id, asPartKind(row.architect_part)]));
  const kindOf = new Map<string, PartKind>();
  for (const row of categories) {
    const kind = own.get(row.id) ?? (row.parent_id ? own.get(row.parent_id) : null);
    if (kind) kindOf.set(row.id, kind);
  }
  if (!kindOf.size) return [];

  const { data, error: productsError } = await client
    .from("products")
    .select(
      `id, name, slug, price, stock, low_stock_threshold, category_id, is_reference,
       brand:brands(name),
       images:product_images(storage_path, alt_text, position),
       specs:product_specs(
         value_text, value_number, value_boolean,
         definition:spec_definitions(key, label, group_label, unit, data_type, position, show_on_card)
       ),
       offers:product_offers(id, store, store_name, url, price, currency, note, checked_at, position)`,
    )
    // Lo que se vende y las piezas de referencia (para comparar; no se venden aquí).
    .or("is_active.eq.true,is_reference.eq.true")
    .in("category_id", [...kindOf.keys()])
    .order("price")
    .order("position", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" })
    .limit(MAX_PARTS)
    .overrideTypes<PartRow[], { merge: false }>();
  if (productsError) {
    throw new Error(`[architect] productos: ${productsError.message.slice(0, 300)}`);
  }

  return data.map((row) => {
    const image = row.images[0];
    return {
      id: row.id,
      kind: kindOf.get(row.category_id) as PartKind,
      name: row.name,
      brand: row.brand?.name ?? null,
      price: Number(row.price),
      stock: row.stock,
      lowStockThreshold: row.low_stock_threshold,
      slug: row.slug,
      image: image ? { path: image.storage_path, alt: image.alt_text } : null,
      demo: false,
      reference: row.is_reference,
      offers: [...row.offers].sort((a, b) => a.position - b.position).map(toOffer),
      ...describeSpecs(row.specs),
    };
  });
}

/**
 * Una configuración guardada por su código. Son inmutables: se cachean sin
 * vencimiento. null si el código no es válido o no existe.
 */
export async function getSavedBuild(code: string): Promise<SavedBuild | null> {
  "use cache";
  cacheTag(`build:${code}`);
  cacheLife("max");

  if (!SHARE_CODE.test(code)) return null;
  const { data, error } = await createPublicClient({ retry: true }).rpc("get_build", {
    p_code: code,
  });
  if (error) throw new Error(`[architect] configuración: ${error.message.slice(0, 300)}`);
  return (data as SavedBuild | null) ?? null;
}
