import { describe, expect, it } from "vitest";
import { demoArchitectParts } from "./parts";
import { catalogSummary } from "./summary";
import type { ArchitectPart } from "./types";

describe("resumen del catálogo de Arma tu PC", () => {
  it("cuenta piezas por tipo, sockets y marcas", () => {
    const parts = demoArchitectParts();
    const branded: ArchitectPart[] = parts.map((part, index) => ({
      ...part,
      brand:
        part.kind === "cpu" ? (index % 2 ? "AMD" : "Intel") : part.kind === "gpu" ? "AMD" : null,
    }));
    const summary = catalogSummary(branded);
    expect(summary.total).toBe(parts.length);
    expect(summary.byKind.cpu).toBe(parts.filter((part) => part.kind === "cpu").length);
    expect(summary.sockets).toEqual(["AM5", "LGA1851"]);
    expect(summary.brands[0]?.name).toBe("AMD");
    expect(summary.brands.every((brand) => brand.count > 0)).toBe(true);
  });

  it("sin piezas todo queda en cero", () => {
    const summary = catalogSummary([]);
    expect(summary.total).toBe(0);
    expect(Object.values(summary.byKind).every((count) => count === 0)).toBe(true);
    expect(summary.sockets).toEqual([]);
  });
});
