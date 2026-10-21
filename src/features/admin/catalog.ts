import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_PAGE_SIZE, sanitizeSearch } from "./shared";

/** Lecturas del catálogo para el panel (incluyen elementos inactivos; RLS exige admin). */

export type ProductFilter = "all" | "active" | "inactive" | "out" | "low";

export async function listAdminProducts({
  q,
  filter = "all",
  page = 1,
}: {
  q?: string;
  filter?: ProductFilter;
  page?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  let query = supabase
    .from("products")
    .select(
      `id, name, slug, sku, price, stock, low_stock_threshold, is_active, is_featured, updated_at,
       brand:brands(name), category:categories(name),
       images:product_images(storage_path, position)`,
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .order("position", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  if (filter === "active") query = query.eq("is_active", true);
  if (filter === "inactive") query = query.eq("is_active", false);
  if (filter === "out") query = query.eq("stock", 0);
  // "Stock bajo" compara dos columnas: se acota en la base y se termina de filtrar aquí.
  if (filter === "low") query = query.gt("stock", 0).lte("stock", 50);

  const search = sanitizeSearch(q);
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = data
    .filter((row) => filter !== "low" || row.stock <= row.low_stock_threshold)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      price: Number(row.price),
      stock: row.stock,
      lowStockThreshold: row.low_stock_threshold,
      isActive: row.is_active,
      isFeatured: row.is_featured,
      brand: row.brand?.name ?? null,
      category: row.category?.name ?? "—",
      image: row.images[0]?.storage_path ?? null,
    }));

  return {
    products: rows,
    total: filter === "low" ? rows.length : (count ?? 0),
    pageCount: Math.max(1, Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)),
  };
}

export async function getAdminProduct(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `*,
       images:product_images(id, storage_path, alt_text, position, width, height),
       specs:product_specs(spec_id, value_text, value_number, value_boolean)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, images: [...data.images].sort((a, b) => a.position - b.position) };
}

export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getAdminProduct>>>;

export async function getCategoryOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, is_active, position")
    .order("position")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getBrandOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, is_active")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getSpecDefinitions(categoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spec_definitions")
    .select("id, key, label, group_label, unit, data_type, is_filterable, position")
    .eq("category_id", categoryId)
    .order("position")
    .order("label");
  if (error) throw error;
  return data;
}

export type SpecDefinition = Awaited<ReturnType<typeof getSpecDefinitions>>[number];

export async function listAdminCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, name, slug, parent_id, is_active, position, products(count), specs:spec_definitions(count)",
    )
    .order("position")
    .order("name");
  if (error) throw error;
  const names = new Map(data.map((row) => [row.id, row.name]));
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parent: row.parent_id ? (names.get(row.parent_id) ?? null) : null,
    isActive: row.is_active,
    position: row.position,
    productCount: row.products[0]?.count ?? 0,
    specCount: row.specs[0]?.count ?? 0,
  }));
}

export async function getAdminCategory(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAdminBrands() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, is_active, products(count)")
    .order("name");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    productCount: row.products[0]?.count ?? 0,
  }));
}

export async function getAdminBrand(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("brands").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Productos activos en o por debajo de su umbral de stock (resumen del panel). */
export async function getLowStockProducts(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, stock, low_stock_threshold")
    .eq("is_active", true)
    .lte("stock", 50)
    .order("stock")
    .limit(200);
  if (error) throw error;
  return data.filter((row) => row.stock <= row.low_stock_threshold).slice(0, limit);
}
