import { z } from "zod";
import { RARITY_EFFECT_KEYS } from "./types";

export const raritySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Escribe el nombre (mínimo 2 letras).").max(40),
  slug: z
    .string()
    .trim()
    .min(1, "Escribe el slug.")
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Usa solo minúsculas, números y guiones."),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Elige un color.")
    .transform((value) => value.toUpperCase()),
  effect: z.enum(RARITY_EFFECT_KEYS as [string, ...string[]], { error: "Elige un efecto." }),
  description: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres.")
    .transform((value) => value || null),
  position: z.coerce
    .number({ error: "Escribe un número." })
    .int("Sin decimales.")
    .min(0, "De 0 a 100.")
    .max(100, "De 0 a 100."),
  isActive: z.boolean(),
});

export type RarityInput = z.input<typeof raritySchema>;
