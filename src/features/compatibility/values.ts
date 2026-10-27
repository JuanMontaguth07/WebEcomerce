import type { PartSpecs } from "./types";

/**
 * Lectura tolerante de la ficha técnica: los admins escriben «322», «322 mm» o
 * «2 × 16 GB», y las claves pueden ser número o texto según cómo se definieron.
 */

/** Número de una especificación («322», «322 mm», «1.000 W», 650). null si no hay. */
export function numberSpec(specs: PartSpecs, key: string): number | null {
  const value = specs[key];
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  // Separador de miles con punto («1.000»); decimales con coma o punto («2,5», «5.3»).
  const match = value.replace(/\.(?=\d{3}\b)/g, "").match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

/** Texto de una especificación, sin espacios sobrantes. null si no hay. */
export function textSpec(specs: PartSpecs, key: string): string | null {
  const value = specs[key];
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

/** Para comparar sockets, memorias o formatos: «Micro-ATX» = «micro atx» = «mATX». */
export function normalizeToken(value: string): string {
  const token = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_-]+/g, "");
  return TOKEN_ALIASES[token] ?? token;
}

const TOKEN_ALIASES: Record<string, string> = {
  matx: "microatx",
  uatx: "microatx",
  mitx: "miniitx",
  extendedatx: "eatx",
};

/** Lista separada por comas, punto y coma o barras: «AM5, AM4 / LGA1700». */
export function listSpec(specs: PartSpecs, key: string): string[] | null {
  const text = textSpec(specs, key);
  if (!text) return null;
  const items = text
    .split(/[,;/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

/** Módulos de un kit de memoria: «2 × 16 GB», «2x16GB», «1 módulo». */
export function moduleCount(specs: PartSpecs): number | null {
  const text = textSpec(specs, "modules");
  if (!text) return null;
  const match = text.match(/^\s*(\d+)\s*(?:[x×*]|módulos?|modulos?)/i);
  return match ? Number(match[1]) : null;
}

/** Una unidad de almacenamiento va en una ranura M.2 si es NVMe o formato M.2. */
export function usesM2Slot(specs: PartSpecs): boolean {
  const text = `${textSpec(specs, "interface") ?? ""} ${textSpec(specs, "form_factor") ?? ""}`;
  return /nvme|m\.2/i.test(text);
}
