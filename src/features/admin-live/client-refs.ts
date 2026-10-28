import { createClient } from "@/lib/supabase/client";
import { toOrderRef, toProductRef } from "./mappers";
import type { OrderRef, ProductRef } from "./types";

/**
 * Lo que el chat necesita de pedidos y productos para sus tarjetas. Se consulta
 * desde el navegador con la sesión del admin (la RLS deja leerlo solo a admins).
 */
const PRODUCT_FIELDS =
  "id, name, sku, price, stock, low_stock_threshold, is_active, product_images (storage_path, alt_text, position)";

export async function fetchOrders(numbers: number[]): Promise<OrderRef[] | null> {
  if (!numbers.length) return [];
  const { data, error } = await createClient()
    .from("orders")
    .select("id, order_number, status, customer_name, total")
    .in("order_number", numbers);
  return error ? null : data.map(toOrderRef);
}

export async function fetchProducts(ids: string[]): Promise<ProductRef[] | null> {
  if (!ids.length) return [];
  const { data, error } = await createClient()
    .from("products")
    .select(PRODUCT_FIELDS)
    .in("id", ids)
    .order("position", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" });
  return error ? null : data.map(toProductRef);
}

/** Productos por nombre o SKU para compartirlos en el chat. */
export async function searchProducts(query: string): Promise<ProductRef[] | null> {
  // Fuera lo que tiene significado en los filtros de PostgREST.
  const term = query
    .replace(/[%,()*"\\]/g, " ")
    .trim()
    .slice(0, 60);
  let request = createClient()
    .from("products")
    .select(PRODUCT_FIELDS)
    .order("updated_at", { ascending: false })
    .order("position", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" })
    .limit(6);
  if (term) request = request.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  const { data, error } = await request;
  return error ? null : data.map(toProductRef);
}
