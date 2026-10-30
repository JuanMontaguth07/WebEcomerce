/**
 * Calidad del catálogo: qué le falta a cada producto para verse bien en la
 * tienda, en Google y en «Arma tu PC». Cada revisión tiene un peso según cuánto
 * afecta la venta; el puntaje es el porcentaje que cumple.
 */

export const QUALITY_CHECKS = {
  no_images: { label: "Sin fotos", severity: "high", anchor: "imagenes" },
  card_specs: { label: "Faltan datos de la tarjeta", severity: "high", anchor: "ficha" },
  price: { label: "Precio sospechoso", severity: "high", anchor: null },
  no_short: { label: "Sin descripción corta", severity: "medium", anchor: null },
  thin_description: { label: "Descripción muy corta", severity: "medium", anchor: null },
  specs: { label: "Ficha técnica incompleta", severity: "medium", anchor: "ficha" },
  visible_out: { label: "Visible pero agotado", severity: "medium", anchor: "inventario" },
  one_image: { label: "Una sola foto", severity: "low", anchor: "imagenes" },
  alt_text: { label: "Fotos sin texto alternativo", severity: "low", anchor: "imagenes" },
  no_brand: { label: "Sin marca", severity: "low", anchor: null },
  no_warranty: { label: "Sin garantía indicada", severity: "low", anchor: null },
  architect: { label: "Faltan datos para Arma tu PC", severity: "low", anchor: "ficha" },
  hidden_ready: { label: "Oculto aunque ya está listo", severity: "low", anchor: null },
} as const;

export type QualityCheck = keyof typeof QUALITY_CHECKS;
export type Severity = (typeof QUALITY_CHECKS)[QualityCheck]["severity"];

const WEIGHT: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

/** Menos de esto en pesos casi seguro es un error de digitación. */
export const SUSPICIOUS_PRICE = 10_000;
/** Una descripción más corta que esto no alcanza para explicar el producto. */
export const MIN_DESCRIPTION = 120;

export type QualityInput = {
  price: number;
  stock: number;
  isActive: boolean;
  /** Solo referencia: no se vende, así que no cuenta lo de estar visible. */
  isReference?: boolean;
  brandId: string | null;
  warrantyMonths: number | null;
  shortDescription: string | null;
  description: string | null;
  images: { alt: string | null }[];
  /** Ids de las especificaciones con valor. */
  filledSpecs: Set<string>;
  /** Especificaciones de su categoría. */
  categorySpecs: { id: string; key: string; showOnCard: boolean }[];
  /** Claves que «Arma tu PC» usa para esta categoría (vacío si no participa). */
  architectKeys: Set<string>;
};

export type QualityResult = { issues: QualityCheck[]; score: number };

/** Qué le falta a un producto y su puntaje de 0 a 100. */
export function assessProduct(input: QualityInput): QualityResult {
  const issues: QualityCheck[] = [];
  const applicable: QualityCheck[] = [
    "no_images",
    "price",
    "no_short",
    "thin_description",
    "no_brand",
    "no_warranty",
  ];
  const fail = (check: QualityCheck) => issues.push(check);

  if (!input.images.length) fail("no_images");
  else {
    applicable.push("one_image", "alt_text");
    if (input.images.length === 1) fail("one_image");
    if (input.images.some((image) => !image.alt?.trim())) fail("alt_text");
  }

  const missing = input.categorySpecs.filter((spec) => !input.filledSpecs.has(spec.id));
  if (input.categorySpecs.some((spec) => spec.showOnCard)) {
    applicable.push("card_specs");
    if (missing.some((spec) => spec.showOnCard)) fail("card_specs");
  }
  if (input.categorySpecs.length) {
    applicable.push("specs");
    if (missing.length) fail("specs");
  }
  const architectSpecs = input.categorySpecs.filter((spec) => input.architectKeys.has(spec.key));
  if (architectSpecs.length) {
    applicable.push("architect");
    if (architectSpecs.some((spec) => !input.filledSpecs.has(spec.id))) fail("architect");
  }

  if (input.price < SUSPICIOUS_PRICE) fail("price");
  if (!input.shortDescription?.trim()) fail("no_short");
  if ((input.description?.trim().length ?? 0) < MIN_DESCRIPTION) fail("thin_description");
  if (!input.brandId) fail("no_brand");
  if (input.warrantyMonths === null) fail("no_warranty");

  if (input.isReference) {
    // No se vende: nada que revisar sobre visibilidad o stock.
  } else if (input.isActive) {
    applicable.push("visible_out");
    if (input.stock <= 0) fail("visible_out");
  } else {
    // Oculto con stock y fotos: probablemente solo falta publicarlo.
    applicable.push("hidden_ready");
    if (input.stock > 0 && input.images.length > 0 && !issues.includes("price")) {
      fail("hidden_ready");
    }
  }

  const total = applicable.reduce((sum, check) => sum + WEIGHT[QUALITY_CHECKS[check].severity], 0);
  const lost = issues.reduce((sum, check) => sum + WEIGHT[QUALITY_CHECKS[check].severity], 0);
  // Las más graves primero.
  issues.sort((a, b) => WEIGHT[QUALITY_CHECKS[b].severity] - WEIGHT[QUALITY_CHECKS[a].severity]);
  return { issues, score: total ? Math.round(((total - lost) / total) * 100) : 100 };
}
