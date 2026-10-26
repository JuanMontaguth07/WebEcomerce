import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

/**
 * Celular o teléfono para WhatsApp. Acepta "300 123 4567", "+57 300…" o
 * "573001234567" y lo guarda en formato internacional sin "+".
 */
const whatsapp = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .transform((digits) => (digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits))
  .refine((digits) => digits === "" || /^[1-9]\d{7,14}$/.test(digits), {
    message: "Escribe el número con indicativo o un celular de 10 dígitos (ej. 300 123 4567).",
  })
  .transform((digits) => digits || null);

export const storeSettingsSchema = z.object({
  whatsappNumber: whatsapp,
  supportEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.union([z.literal(""), z.email("Correo inválido.")]))
    .transform((value) => value || null),
  supportHours: optionalText(200),
  legalName: optionalText(200),
  legalNit: z
    .string()
    .transform((value) => value.replace(/[\s.]/g, ""))
    .refine((value) => value === "" || /^\d{5,15}$/.test(value), {
      message: "Solo números, sin el dígito de verificación (ej. 1234567890).",
    })
    .transform((value) => value || null),
  legalDv: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d$/.test(value), { message: "Un solo dígito (0 a 9)." })
    .transform((value) => value || null),
  legalAddress: optionalText(200),
  legalCity: optionalText(100),
  // Nequi: celular colombiano de 10 dígitos (se acepta con +57 o espacios).
  nequiNumber: z
    .string()
    .transform((value) => value.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, ""))
    .refine((digits) => digits === "" || /^3\d{9}$/.test(digits), {
      message: "Celular de 10 dígitos que empiece por 3 (ej. 300 123 4567).",
    })
    .transform((digits) => digits || null),
  nequiHolder: optionalText(120),
});

export type StoreSettingsInput = z.input<typeof storeSettingsSchema>;
