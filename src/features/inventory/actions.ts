"use server";

import { revalidateCatalog } from "@/features/catalog/revalidate";
import { adminAction } from "@/lib/admin-action";
import { AppError } from "@/lib/errors";
import { adjustStockSchema } from "./schemas";

/** Ajusta el stock de un producto mediante la función transaccional adjust_stock. */
export const adjustStock = adminAction(adjustStockSchema, async (input, { supabase }) => {
  const { data: resultingStock, error } = await supabase.rpc("adjust_stock", {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_movement_type: input.movementType,
    p_reason: input.reason ?? "",
  });
  if (error) throw error;

  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", input.productId)
    .maybeSingle();
  if (!product) throw new AppError("NOT_FOUND");

  revalidateCatalog({ productSlugs: [product.slug] });
  return { stock: resultingStock };
});
