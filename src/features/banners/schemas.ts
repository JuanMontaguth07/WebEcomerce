import { z } from "zod";
import { BANNER_ILLUSTRATION_KEYS } from "./types";

export const BANNER_IMAGE_PATH = /^banners\/[0-9a-f-]{36}\.(webp|png|jpg|jpeg|avif)$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

export const bannerSchema = z
  .object({
    id: z.uuid().optional(),
    eyebrow: optionalText(40),
    title: z.string().trim().min(3, "Escribe el título.").max(70, "Máximo 70 caracteres."),
    body: optionalText(220),
    ctaLabel: optionalText(30),
    // Solo rutas de la tienda: «//» o «/\» llevarían a otro sitio.
    ctaHref: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\/([^/\\\s][^\s]{0,198})?$/.test(value), {
        message: "Escribe una ruta de la tienda que empiece por / (ej. /productos).",
      })
      .transform((value) => value || null),
    imagePath: z.string().regex(BANNER_IMAGE_PATH, "Imagen inválida.").nullable(),
    illustration: z.enum(BANNER_ILLUSTRATION_KEYS as [string, ...string[]]),
    isActive: z.boolean(),
  })
  .superRefine((banner, ctx) => {
    if (banner.ctaLabel && !banner.ctaHref) {
      ctx.addIssue({ code: "custom", path: ["ctaHref"], message: "¿A dónde lleva el botón?" });
    }
    if (banner.ctaHref && !banner.ctaLabel) {
      ctx.addIssue({ code: "custom", path: ["ctaLabel"], message: "Escribe el texto del botón." });
    }
  });

export type BannerInput = z.input<typeof bannerSchema>;
