/**
 * Distribución de las categorías en el bento de la portada (2 columnas en móvil,
 * 4 desde tablet). Con 3 o más categorías, la de más productos ocupa 2 × 2 y la
 * siguiente 2 × 1; el resto, una celda. La celda final «Todo el catálogo» se
 * estira lo justo para cerrar la última fila sin huecos.
 */
export type BentoSize = "feature" | "wide" | "cell";

export type BentoLayout = {
  sizes: BentoSize[];
  /** Columnas que ocupa la celda final en móvil (de 2) y desde tablet (de 4). */
  closing: { base: 1 | 2; md: 1 | 2 | 3 | 4 };
};

const AREA: Record<BentoSize, { base: number; md: number }> = {
  feature: { base: 4, md: 4 },
  wide: { base: 2, md: 2 },
  cell: { base: 1, md: 1 },
};

export function bentoLayout(count: number): BentoLayout {
  const sizes: BentoSize[] =
    count >= 3
      ? ["feature", "wide", ...Array.from({ length: count - 2 }, () => "cell" as const)]
      : Array.from({ length: count }, () => "wide" as const);
  const used = sizes.reduce(
    (total, size) => ({ base: total.base + AREA[size].base, md: total.md + AREA[size].md }),
    { base: 0, md: 0 },
  );
  return {
    sizes,
    closing: {
      base: (2 - (used.base % 2)) as 1 | 2,
      md: (4 - (used.md % 4)) as 1 | 2 | 3 | 4,
    },
  };
}

/** Ordena por cantidad de productos; a igual cantidad respeta el orden del panel. */
export function sortByProductCount<T extends { count: number }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.count - a.item.count || a.index - b.index)
    .map(({ item }) => item);
}
