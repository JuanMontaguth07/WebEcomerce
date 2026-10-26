/** Etiqueta tipo bandera de un producto (marca o línea: NVIDIA, AMD Ryzen…). */
export type ProductFlag = {
  id: string;
  name: string;
  /** Color #RRGGBB de fondo de la bandera. */
  color: string;
  /** Ruta del logo en el bucket del catálogo (flags/…), o null. */
  logoPath: string | null;
  /** false = solo el logo (el nombre queda para lectores de pantalla). */
  showName: boolean;
  isActive: boolean;
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * Texto blanco o casi negro, el que más contraste tenga con el color de la
 * bandera: así cualquier color que elija el admin se lee.
 */
export function flagTextColor(background: string): "#FFFFFF" | "#111111" {
  const bg = luminance(background);
  return contrast(bg, 1) >= contrast(bg, luminance("#111111")) ? "#FFFFFF" : "#111111";
}

/** Contraste del texto elegido sobre la bandera (para avisar en el panel si es bajo). */
export function flagContrast(background: string): number {
  const bg = luminance(background);
  return contrast(bg, luminance(flagTextColor(background)));
}
