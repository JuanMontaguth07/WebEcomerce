/**
 * Preferencias visuales del panel por administrador (profiles.admin_accent y
 * admin_font). Los tonos de cada acento están en globals.css y se probaron en
 * modo claro y oscuro (texto del acento ≥ 4,5:1 sobre el fondo).
 */

export const ADMIN_ACCENTS = {
  orange: { label: "Naranja", swatch: "#C2410C" },
  red: { label: "Rojo Kova", swatch: "#D61F2C" },
  lime: { label: "Lima", swatch: "#3F6212" },
  blue: { label: "Azul", swatch: "#1D4ED8" },
  violet: { label: "Violeta", swatch: "#6D28D9" },
  teal: { label: "Verde azulado", swatch: "#0F766E" },
} as const;

export type AdminAccent = keyof typeof ADMIN_ACCENTS;

export const ADMIN_FONTS = {
  plex: { label: "IBM Plex Sans", hint: "Técnica y sobria, pensada para interfaces." },
  figtree: { label: "Figtree", hint: "Geométrica y amable, muy legible." },
  hanken: { label: "Hanken Grotesk", hint: "La misma de la tienda." },
} as const;

export type AdminFont = keyof typeof ADMIN_FONTS;

export const ADMIN_ACCENT_KEYS = Object.keys(ADMIN_ACCENTS) as AdminAccent[];
export const ADMIN_FONT_KEYS = Object.keys(ADMIN_FONTS) as AdminFont[];

export const DEFAULT_ACCENT: AdminAccent = "orange";
export const DEFAULT_FONT: AdminFont = "plex";

export function toAccent(value: string | null | undefined): AdminAccent {
  return value && Object.hasOwn(ADMIN_ACCENTS, value) ? (value as AdminAccent) : DEFAULT_ACCENT;
}

export function toFont(value: string | null | undefined): AdminFont {
  return value && Object.hasOwn(ADMIN_FONTS, value) ? (value as AdminFont) : DEFAULT_FONT;
}
