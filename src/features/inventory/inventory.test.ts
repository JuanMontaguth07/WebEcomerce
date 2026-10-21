import { describe, expect, it } from "vitest";
import { adjustStockSchema } from "./schemas";

const productId = "8a6e0804-2bd0-4672-b79d-d97027f9071a";

describe("adjustStockSchema", () => {
  it("acepta entradas positivas y ajustes con motivo", () => {
    expect(
      adjustStockSchema.safeParse({ productId, movementType: "restock", quantity: "5" }).success,
    ).toBe(true);
    expect(
      adjustStockSchema.safeParse({
        productId,
        movementType: "adjustment",
        quantity: -2,
        reason: "Conteo físico",
      }).success,
    ).toBe(true);
  });

  it("rechaza cero, decimales, entradas negativas y ajustes sin motivo", () => {
    const cases = [
      { productId, movementType: "restock", quantity: 0 },
      { productId, movementType: "restock", quantity: 1.5 },
      { productId, movementType: "restock", quantity: -3 },
      { productId, movementType: "adjustment", quantity: -3 },
      { productId: "no-uuid", movementType: "restock", quantity: 1 },
      { productId, movementType: "sale", quantity: -1 },
    ];
    for (const input of cases) {
      expect(adjustStockSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
    }
  });
});
