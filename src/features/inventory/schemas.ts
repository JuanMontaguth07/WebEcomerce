import { z } from "zod";

export const MANUAL_MOVEMENT_TYPES = ["initial", "restock", "adjustment", "return"] as const;

export const MOVEMENT_LABELS = {
  initial: "Carga inicial",
  restock: "Reabastecimiento",
  sale: "Venta",
  cancellation: "Cancelación de pedido",
  adjustment: "Ajuste manual",
  return: "Devolución",
} as const;

/**
 * Ajuste manual de inventario. Las entradas (carga inicial, reabastecimiento,
 * devolución) son positivas; el ajuste puede ser negativo y exige motivo.
 */
export const adjustStockSchema = z
  .object({
    productId: z.uuid(),
    movementType: z.enum(MANUAL_MOVEMENT_TYPES),
    quantity: z.coerce
      .number()
      .int("La cantidad debe ser un número entero.")
      .min(-100_000)
      .max(100_000)
      .refine((value) => value !== 0, "La cantidad no puede ser cero."),
    reason: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.movementType !== "adjustment" && value.quantity < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Las entradas de inventario deben ser positivas. Usa un ajuste para restar.",
      });
    }
    if (value.movementType === "adjustment" && (value.reason ?? "").length < 3) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Indica el motivo del ajuste." });
    }
  });

export type AdjustStockInput = z.input<typeof adjustStockSchema>;
