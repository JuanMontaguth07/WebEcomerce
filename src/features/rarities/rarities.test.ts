import { describe, expect, it } from "vitest";
import { describeActivity, formatValue } from "@/features/activity/format";
import { raritySchema } from "./schemas";
import { rarityStyle } from "./types";

const valid = {
  name: " Legendaria ",
  slug: "legendaria",
  color: "#f2a900",
  effect: "holo",
  description: "",
  position: "3",
  isActive: true,
};

describe("raritySchema", () => {
  it("normaliza nombre, color y nivel", () => {
    expect(raritySchema.parse(valid)).toEqual({
      name: "Legendaria",
      slug: "legendaria",
      color: "#F2A900",
      effect: "holo",
      description: null,
      position: 3,
      isActive: true,
    });
  });

  it("rechaza colores, efectos y niveles inválidos", () => {
    for (const overrides of [
      { color: "dorado" },
      { color: "#FFF" },
      { effect: "fuego" },
      { position: "101" },
      { slug: "Con Espacios" },
      { name: "L" },
    ]) {
      expect(
        raritySchema.safeParse({ ...valid, ...overrides }).success,
        JSON.stringify(overrides),
      ).toBe(false);
    }
  });

  it("expone el color como variable CSS", () => {
    expect(rarityStyle({ color: "#2F80ED" })).toEqual({ "--rarity": "#2F80ED" });
  });
});

describe("rarezas en el historial", () => {
  it("describe y formatea los cambios", () => {
    expect(
      describeActivity({
        id: 1,
        occurredAt: "2026-10-28T12:00:00Z",
        actorId: "u1",
        actorLabel: "Juan",
        entity: "rarity",
        action: "create",
        entityId: "r1",
        entityLabel: "Mítica",
        changes: null,
        reason: null,
      }),
    ).toBe("creó la rareza «Mítica»");
    expect(formatValue("effect", "holo")).toBe("Holográfico");
    expect(formatValue("rarity_id", "r1", new Map([["r1", "Épica"]]))).toBe("Épica");
  });
});
