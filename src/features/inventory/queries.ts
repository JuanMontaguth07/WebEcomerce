import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type MovementType = Database["public"]["Enums"]["inventory_movement_type"];

export type InventoryMovement = {
  id: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  resultingStock: number;
  reason: string | null;
  createdAt: string;
  orderId: string | null;
  product: { id: string; name: string; sku: string; slug: string } | null;
  author: string | null;
};

const PAGE_SIZE = 50;

/** Historial de inventario (solo administradores, por RLS). */
export async function getInventoryMovements({
  productId,
  type,
  page = 1,
}: { productId?: string; type?: MovementType; page?: number } = {}) {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("inventory_movements")
    .select(
      `id, movement_type, quantity, previous_stock, resulting_stock, reason, created_at, order_id,
       product:products(id, name, sku, slug),
       author:profiles(full_name, email)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (productId) query = query.eq("product_id", productId);
  if (type) query = query.eq("movement_type", type);

  const { data, error, count } = await query;
  if (error) throw error;

  const movements: InventoryMovement[] = data.map((row) => ({
    id: row.id,
    type: row.movement_type,
    quantity: row.quantity,
    previousStock: row.previous_stock,
    resultingStock: row.resulting_stock,
    reason: row.reason,
    createdAt: row.created_at,
    orderId: row.order_id,
    product: row.product,
    author: row.author?.full_name ?? row.author?.email ?? null,
  }));

  return {
    movements,
    total: count ?? 0,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}
