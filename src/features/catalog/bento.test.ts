import { describe, expect, it } from "vitest";
import { bentoLayout, sortByProductCount } from "./bento";

/** Celdas que ocupa cada tamaño, para comprobar que las filas cierran. */
const AREA = { feature: { base: 4, md: 4 }, wide: { base: 2, md: 2 }, cell: { base: 1, md: 1 } };

describe("bentoLayout", () => {
  it("destaca la primera y ensancha la segunda desde 3 categorías", () => {
    expect(bentoLayout(5).sizes).toEqual(["feature", "wide", "cell", "cell", "cell"]);
  });

  it("con 1 o 2 categorías todas van anchas", () => {
    expect(bentoLayout(1)).toEqual({ sizes: ["wide"], closing: { base: 2, md: 2 } });
    expect(bentoLayout(2)).toEqual({ sizes: ["wide", "wide"], closing: { base: 2, md: 4 } });
  });

  it("la celda final siempre cierra la última fila en móvil y en tablet", () => {
    for (let count = 1; count <= 14; count += 1) {
      const { sizes, closing } = bentoLayout(count);
      const base = sizes.reduce((sum, size) => sum + AREA[size].base, 0) + closing.base;
      const md = sizes.reduce((sum, size) => sum + AREA[size].md, 0) + closing.md;
      expect(base % 2, `móvil con ${count}`).toBe(0);
      expect(md % 4, `tablet con ${count}`).toBe(0);
    }
  });
});

describe("sortByProductCount", () => {
  it("ordena por productos y desempata con el orden del panel", () => {
    const sorted = sortByProductCount([
      { slug: "ram", count: 2 },
      { slug: "gpu", count: 9 },
      { slug: "ssd", count: 2 },
      { slug: "cpu", count: 0 },
    ]);
    expect(sorted.map((item) => item.slug)).toEqual(["gpu", "ram", "ssd", "cpu"]);
  });
});
