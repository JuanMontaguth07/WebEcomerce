import { z } from "zod";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slug = z
  .string()
  .trim()
  .min(1, "Escribe el slug (parte de la URL).")
  .max(120)
  .regex(SLUG, "Usa solo minúsculas, números y guiones, sin espacios.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null)
    .nullable()
    .optional();

const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .transform((value) => value || null)
  .nullable()
  .optional();

const money = z.coerce
  .number({ message: "Escribe un valor en pesos." })
  .int("Usa pesos enteros, sin decimales.")
  .min(0)
  .max(10_000_000_000);

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe el nombre del producto.").max(200),
    slug,
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9._-]{1,63}$/, "Usa letras, números, puntos o guiones (2–64)."),
    productType: z.enum(["component", "prebuilt", "peripheral"]),
    categoryId: z.uuid("Selecciona una categoría."),
    brandId: optionalUuid,
    price: money.refine((value) => value > 0, "El precio debe ser mayor que cero."),
    // En estas uniones el literal "" va primero: z.coerce convertiría "" en 0.
    compareAtPrice: z
      .union([z.literal(""), z.null(), money])
      .transform((value) => (value === "" || value === null || value === 0 ? null : value))
      .optional(),
    lowStockThreshold: z.coerce.number().int().min(0).max(10_000),
    warrantyMonths: z
      .union([z.literal(""), z.coerce.number().int().min(0).max(120)])
      .transform((value) => (value === "" ? null : value))
      .nullable()
      .optional(),
    shortDescription: optionalText(300),
    description: optionalText(20_000),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    seoTitle: optionalText(70),
    seoDescription: optionalText(160),
  })
  .superRefine((value, ctx) => {
    if (
      value.compareAtPrice !== null &&
      value.compareAtPrice !== undefined &&
      value.compareAtPrice <= value.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPrice"],
        message: "El precio anterior debe ser mayor que el precio actual (o déjalo vacío).",
      });
    }
  });

export type ProductInput = z.input<typeof productSchema>;
export type ProductValues = z.output<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre.").max(80),
  slug,
  parentId: optionalUuid,
  description: optionalText(2000),
  position: z.coerce.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
});

export type CategoryInput = z.input<typeof categorySchema>;

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre.").max(80),
  slug,
  description: optionalText(2000),
  isActive: z.boolean(),
});

export type BrandInput = z.input<typeof brandSchema>;

export const specDefinitionSchema = z.object({
  id: optionalUuid,
  categoryId: z.uuid(),
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{0,49}$/, "Usa minúsculas, números y guion bajo; empieza con letra."),
  label: z.string().trim().min(1, "Escribe la etiqueta.").max(80),
  groupLabel: optionalText(60),
  unit: optionalText(20),
  dataType: z.enum(["text", "number", "boolean"]),
  isFilterable: z.boolean(),
  position: z.coerce.number().int().min(0).max(1000),
});

export type SpecDefinitionInput = z.input<typeof specDefinitionSchema>;
