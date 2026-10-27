/**
 * Tinte de color por categoría para el fondo de las fotos e ilustraciones de las
 * tarjetas: le da variedad a una grilla sin depender de que haya fotos. Se
 * deriva del slug, así cada categoría conserva su tono sin configurarlo.
 */
const HUES = [130, 210, 285, 75, 175, 20, 245, 105];

export function categoryTint(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = HUES[hash % HUES.length] ?? HUES[0];
  return `oklch(0.78 0.13 ${hue})`;
}
