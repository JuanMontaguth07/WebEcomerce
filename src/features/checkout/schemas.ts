import { z } from "zod";
import { MAX_LINES, MAX_QUANTITY } from "@/features/cart/logic";
import { DEPARTMENTS } from "./departments";

/** Quita espacios, guiones, puntos y paréntesis: "+57 300 123-4567" → "+573001234567". */
export const normalizePhone = (value: string) => value.replace(/[\s().-]/g, "");

/**
 * Datos del cliente. Las mismas reglas que aplica la base de datos, para
 * mostrar errores claros antes de enviar.
 */
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Escribe tu nombre completo.")
    .max(120, "El nombre es demasiado largo."),
  // Primero se limpia (espacios, mayúsculas) y luego se valida el formato.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Escribe un correo válido, por ejemplo nombre@dominio.com.").max(254)),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z.string().regex(/^\+?\d{7,15}$/, "Escribe un teléfono válido, por ejemplo 300 123 4567."),
    ),
  document: z
    .string()
    .trim()
    .max(20)
    .refine((value) => value === "" || /^[0-9A-Za-z-]{5,20}$/.test(value), {
      message: "Escribe solo números y letras, sin puntos.",
    })
    .optional(),
  department: z.enum(DEPARTMENTS, { message: "Selecciona un departamento." }),
  city: z.string().trim().min(2, "Escribe la ciudad o municipio.").max(80),
  address: z
    .string()
    .trim()
    .min(5, "Escribe la dirección completa, por ejemplo Calle 10 # 20-30.")
    .max(200),
  notes: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
  dataConsent: z.literal(true, {
    message: "Debes autorizar el tratamiento de tus datos para continuar.",
  }),
});

export const checkoutSchema = z.object({
  customer: customerSchema,
  items: z
    .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY) }))
    .min(1, "Tu carrito está vacío.")
    .max(MAX_LINES),
  /** Campo trampa: los humanos no lo ven; si llega con contenido, es un bot. */
  website: z.string().max(0).optional(),
});

export type CustomerInput = z.input<typeof customerSchema>;
export type CheckoutInput = z.input<typeof checkoutSchema>;
