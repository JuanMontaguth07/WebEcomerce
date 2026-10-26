import { describe, expect, it } from "vitest";
import { describeActivity, formatValue } from "@/features/activity/format";
import { flagSchema } from "./schemas";
import { flagContrast, flagTextColor } from "./types";

const valid = {
  name: " NVIDIA ",
  color: "#76b900",
  logoPath: "flags/8a6e0804-2bd0-4672-b79d-d97027f9071a.png",
  showName: true,
  isActive: true,
};

describe("flagTextColor", () => {
  it("elige el texto de mayor contraste para cada color", () => {
    expect(flagTextColor("#111111")).toBe("#FFFFFF");
    expect(flagTextColor("#0071C5")).toBe("#FFFFFF");
    expect(flagTextColor("#ED1C24")).toBe("#FFFFFF");
    expect(flagTextColor("#76B900")).toBe("#111111");
    expect(flagTextColor("#FFE066")).toBe("#111111");
  });

  it("siempre llega a un contraste legible (≥ 4,5:1 salvo tonos medios extremos)", () => {
    for (const color of ["#111111", "#0071C5", "#76B900", "#FFFFFF", "#7C3AED", "#F97316"]) {
      expect(flagContrast(color), color).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("flagSchema", () => {
  it("normaliza nombre y color", () => {
    expect(flagSchema.parse(valid)).toMatchObject({ name: "NVIDIA", color: "#76B900" });
  });

  it("rechaza logos fuera de flags/ y etiquetas sin nombre ni logo", () => {
    expect(flagSchema.safeParse({ ...valid, logoPath: "products/x/y.png" }).success).toBe(false);
    expect(flagSchema.safeParse({ ...valid, logoPath: "flags/x.svg" }).success).toBe(false);
    expect(flagSchema.safeParse({ ...valid, logoPath: null, showName: false }).success).toBe(false);
    expect(flagSchema.safeParse({ ...valid, logoPath: null }).success).toBe(true);
  });
});

describe("etiquetas en el historial", () => {
  it("describe y resuelve el nombre de la etiqueta", () => {
    expect(
      describeActivity({
        id: 1,
        occurredAt: "2026-10-29T12:00:00Z",
        actorId: "u1",
        actorLabel: "Juan",
        entity: "product_flag",
        action: "update",
        entityId: "f1",
        entityLabel: "AMD Ryzen",
        changes: { color: { old: "#000000", new: "#ED1C24" } },
        reason: null,
      }),
    ).toBe("editó la etiqueta «AMD Ryzen»");
    expect(formatValue("flag_id", "f1", new Map([["f1", "NVIDIA"]]))).toBe("NVIDIA");
  });
});
