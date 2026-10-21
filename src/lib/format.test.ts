import { describe, expect, it } from "vitest";
import { discountPercent, formatCOP, slugify } from "./format";

describe("formatCOP", () => {
  it("usa separador de miles con punto y sin decimales", () => {
    expect(formatCOP(2849900).replace(/\s/g, " ")).toBe("$ 2.849.900");
  });

  it("formatea cero", () => {
    expect(formatCOP(0).replace(/\s/g, " ")).toBe("$ 0");
  });
});

describe("discountPercent", () => {
  it("calcula el porcentaje redondeado hacia abajo", () => {
    expect(discountPercent(2849900, 3239900)).toBe(12);
  });

  it("devuelve null sin precio anterior o si no es mayor", () => {
    expect(discountPercent(100, null)).toBeNull();
    expect(discountPercent(100, 100)).toBeNull();
  });
});

describe("slugify", () => {
  const dbSlugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  it("elimina tildes y caracteres especiales", () => {
    expect(slugify("Tarjetas Gráficas & GPU")).toBe("tarjetas-graficas-gpu");
  });

  it("produce slugs válidos para la base de datos", () => {
    for (const input of ["  Ñandú  ", "RTX 5070 Ti — 16 GB", "---x---", "a".repeat(200)]) {
      const slug = slugify(input);
      expect(slug).toMatch(dbSlugPattern);
      expect(slug.length).toBeLessThanOrEqual(120);
    }
  });
});
