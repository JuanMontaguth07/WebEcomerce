import { z } from "zod";
import { DEPARTMENTS } from "@/features/checkout/departments";

const days = z.union([
  z.literal("").transform(() => null),
  z.coerce
    .number({ error: "Escribe un número." })
    .int("Sin decimales.")
    .min(0, "No puede ser negativo.")
    .max(60, "Máximo 60 días."),
]);

export const shippingRateSchema = z
  .object({
    id: z.uuid().optional(),
    department: z.enum(DEPARTMENTS, { error: "Elige un departamento." }),
    // Vacío = tarifa general del departamento.
    city: z
      .string()
      .trim()
      .max(80, "Máximo 80 caracteres.")
      .refine((value) => value === "" || value.length >= 2, { message: "Escribe la ciudad." })
      .transform((value) => value || null),
    price: z.coerce
      .number({ error: "Escribe el valor del envío." })
      .int("Sin decimales.")
      .min(0, "No puede ser negativo.")
      .max(100_000_000, "Valor demasiado alto."),
    minDays: days,
    maxDays: days,
    isActive: z.boolean(),
  })
  .refine(
    (rate) => rate.minDays === null || rate.maxDays === null || rate.minDays <= rate.maxDays,
    {
      path: ["maxDays"],
      message: "Debe ser mayor o igual al mínimo.",
    },
  );

export type ShippingRateInput = z.input<typeof shippingRateSchema>;

/** Consulta pública del checkout. */
export const shippingPlaceSchema = z.object({
  department: z.enum(DEPARTMENTS),
  city: z.string().trim().min(2).max(80),
});
