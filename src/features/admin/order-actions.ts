"use server";

import { z } from "zod";
import { revalidateCatalog } from "@/features/catalog/revalidate";
import { adminAction } from "@/lib/admin-action";

const changeStatusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(["confirmed", "preparing", "shipped", "delivered", "cancelled"]),
  note: z.string().trim().max(500).optional(),
});

/** Cambia el estado de un pedido. Al cancelar, la base devuelve el stock reservado. */
export const changeOrderStatus = adminAction(changeStatusSchema, async (input, { supabase }) => {
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: input.orderId,
    p_status: input.status,
    p_note: input.note || undefined,
  });
  if (error) throw error;

  if (input.status === "cancelled") {
    // El stock volvió: la tienda debe mostrarlo de inmediato.
    const { data } = await supabase
      .from("order_items")
      .select("product:products(slug)")
      .eq("order_id", input.orderId);
    revalidateCatalog({
      productSlugs: (data ?? []).flatMap((row) => (row.product ? [row.product.slug] : [])),
    });
  }
  return { status: input.status };
});
