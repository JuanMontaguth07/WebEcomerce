import { z } from "zod";

export const FLAG_LOGO_PATH = /^flags\/[0-9a-f-]{36}\.(webp|png|jpg|jpeg|avif)$/;

export const flagSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2, "Escribe el nombre (mínimo 2 letras).").max(40),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "Elige un color.")
      .transform((value) => value.toUpperCase()),
    logoPath: z.string().regex(FLAG_LOGO_PATH, "Logo inválido.").nullable(),
    showName: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((flag) => flag.showName || flag.logoPath, {
    path: ["showName"],
    message: "Sin nombre visible la etiqueta necesita un logo.",
  });

export type FlagInput = z.input<typeof flagSchema>;
