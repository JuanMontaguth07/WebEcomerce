"use server";

import { z } from "zod";
import { revalidateCatalog } from "@/features/catalog/revalidate";
import { adminAction } from "@/lib/admin-action";
import { AppError } from "@/lib/errors";

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

const shippingSchema = z.object({
  orderId: z.uuid(),
  // Texto del formulario sin puntos de miles: vacío no se interpreta como envío gratis.
  shippingCost: z
    .string()
    .transform((value) => value.replace(/[\s.$]/g, ""))
    .pipe(
      z
        .string()
        .min(1, "Escribe el valor del envío (0 si es gratis).")
        .regex(/^\d+$/, "Usa solo números, sin decimales.")
        .transform(Number)
        .pipe(z.number().max(100_000_000, "Revisa el valor.")),
    ),
  note: z.string().trim().max(500).optional(),
});

/** Fija el envío de un pedido (p. ej. «por confirmar») y recalcula el total que ve el cliente. */
export const setOrderShipping = adminAction(shippingSchema, async (input, { supabase }) => {
  const { data, error } = await supabase.rpc("set_order_shipping", {
    p_order_id: input.orderId,
    p_shipping_cost: input.shippingCost,
    p_note: input.note || undefined,
  });
  if (error) throw error;
  return { total: Number(data) };
});

const RECEIPT_ERRORS: Record<string, string> = {
  REASON_REQUIRED: "Escribe el motivo del rechazo: el cliente lo verá.",
  ALREADY_REVIEWED: "Este comprobante ya se revisó.",
};

/** Aprueba (confirma el pedido) o rechaza con motivo el comprobante que subió el cliente. */
export const reviewPaymentReceipt = adminAction(
  z.object({
    receiptId: z.uuid(),
    approve: z.boolean(),
    note: z.string().trim().max(300).optional(),
  }),
  async ({ receiptId, approve, note }, { supabase }) => {
    const { error } = await supabase.rpc("review_payment_receipt", {
      p_receipt_id: receiptId,
      p_approve: approve,
      p_note: note || undefined,
    });
    if (error) {
      const message = RECEIPT_ERRORS[error.message];
      if (message) throw new AppError("VALIDATION", { message });
      throw error;
    }
    return { approved: approve };
  },
);
