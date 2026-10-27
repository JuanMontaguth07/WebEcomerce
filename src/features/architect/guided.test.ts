import { describe, expect, it } from "vitest";
import { checkBuild } from "@/features/compatibility/engine";
import { numberSpec } from "@/features/compatibility/values";
import { indexParts, toBuild } from "./build";
import { budgetShares, DEFAULT_ANSWERS, recommendBuild, type GuidedAnswers } from "./guided";
import { demoArchitectParts } from "./parts";

const parts = demoArchitectParts();
const index = indexParts(parts);
const answers = (overrides: Partial<GuidedAnswers> = {}): GuidedAnswers => ({
  ...DEFAULT_ANSWERS,
  ...overrides,
});
const pick = (result: ReturnType<typeof recommendBuild>, kind: string) =>
  result.picks.find((item) => item.kind === kind)?.part;

describe("reparto del presupuesto", () => {
  it("siempre suma 100 % y la gráfica pesa más para jugar", () => {
    for (const use of ["gaming", "work", "study", "editing", "all"] as const) {
      const shares = budgetShares(answers({ use, priority: "looks", resolution: "4k" }));
      const total = Object.values(shares).reduce((sum, value) => sum + (value ?? 0), 0);
      expect(total).toBeCloseTo(100, 5);
    }
    const gaming = budgetShares(answers({ use: "gaming" }));
    expect(gaming.gpu).toBeGreaterThan(gaming.cpu ?? 0);
    const work = budgetShares(answers({ use: "work" }));
    expect(work.cpu).toBeGreaterThan(work.gpu ?? 0);
  });

  it("en 4K la gráfica se lleva más que en 1080p", () => {
    const at = (resolution: GuidedAnswers["resolution"]) =>
      budgetShares(answers({ resolution })).gpu ?? 0;
    expect(at("4k")).toBeGreaterThan(at("1440p"));
    expect(at("1440p")).toBeGreaterThan(at("1080p"));
  });
});

describe("recomendación", () => {
  it("arma un equipo completo y sin incompatibilidades", () => {
    const result = recommendBuild(answers({ budget: 9_000_000 }), parts);
    expect(result.missing).toEqual([]);
    expect(result.picks.map((item) => item.kind)).toEqual([
      "cpu",
      "motherboard",
      "ram",
      "gpu",
      "case",
      "cooler",
      "storage",
      "psu",
    ]);
    const errors = checkBuild(toBuild(result.selection, index)).filter(
      (item) => item.status === "error",
    );
    expect(errors).toEqual([]);
    expect(result.total).toBeLessThanOrEqual(result.towerBudget);
  });

  it("con más presupuesto elige mejores piezas", () => {
    const low = recommendBuild(answers({ budget: 5_000_000 }), parts);
    const high = recommendBuild(answers({ budget: 14_000_000 }), parts);
    const vram = (result: typeof low) => numberSpec(pick(result, "gpu")?.specs ?? {}, "vram") ?? 0;
    expect(vram(high)).toBeGreaterThan(vram(low));
    expect(high.total).toBeGreaterThan(low.total);
  });

  it("explica el porqué con datos de la ficha", () => {
    const result = recommendBuild(answers({ budget: 9_000_000 }), parts);
    const gpu = result.picks.find((item) => item.kind === "gpu");
    expect(gpu?.reason).toMatch(/^Se lleva el \d+ % del presupuesto porque para jugar/);
    expect(gpu?.reason).toMatch(/GB de memoria de video/);
  });

  it("la fuente alcanza con margen para el consumo y lo que pide la gráfica", () => {
    const result = recommendBuild(answers({ budget: 14_000_000 }), parts);
    const psu = pick(result, "psu");
    const gpu = pick(result, "gpu");
    const wattage = numberSpec(psu?.specs ?? {}, "wattage") ?? 0;
    expect(wattage).toBeGreaterThanOrEqual(numberSpec(gpu?.specs ?? {}, "recommended_psu") ?? 0);
    const power = checkBuild(toBuild(result.selection, index)).find(
      (item) => item.rule === "psu-wattage",
    );
    expect(power?.status).toBe("ok");
  });

  it("respeta la marca preferida del procesador", () => {
    const intel = recommendBuild(answers({ brand: "intel", budget: 12_000_000 }), parts);
    expect(pick(intel, "cpu")?.specs.socket).toBe("LGA1851");
    expect(pick(intel, "motherboard")?.specs.socket).toBe("LGA1851");
    const amd = recommendBuild(answers({ brand: "amd", budget: 12_000_000 }), parts);
    expect(pick(amd, "cpu")?.specs.socket).toBe("AM5");
  });

  it("si no hay de la marca pedida, elige la mejor y lo dice", () => {
    // Las gráficas demo no son de ninguna marca.
    const result = recommendBuild(answers({ brand: "nvidia" }), parts);
    expect(pick(result, "gpu")).toBeDefined();
    expect(result.notes.join(" ")).toMatch(/No hay tarjeta gráfica de la marca que prefieres/);
  });

  it("con poco presupuesto elige lo más económico que encaja y avisa", () => {
    const result = recommendBuild(answers({ budget: 2_000_000 }), parts);
    expect(result.missing).toEqual([]);
    expect(result.notes[0]).toMatch(/no alcanza/);
  });

  it("aparta lo del monitor y los periféricos del presupuesto de la torre", () => {
    const result = recommendBuild(
      answers({ budget: 10_000_000, extras: "monitor-peripherals" }),
      parts,
    );
    expect(result.extrasBudget).toBe(2_200_000);
    expect(result.towerBudget).toBe(7_800_000);
    expect(result.notes.join(" ")).toMatch(/monitor y los periféricos/);
  });

  it("ofrece una alternativa más económica y otra mejor cuando existen", () => {
    const result = recommendBuild(answers({ budget: 9_000_000 }), parts);
    const gpu = result.picks.find((item) => item.kind === "gpu");
    expect(gpu?.cheaper?.price ?? 0).toBeLessThan(gpu?.part.price ?? 0);
    expect(gpu?.better?.price ?? Infinity).toBeGreaterThan(gpu?.part.price ?? 0);
  });

  it("sin piezas de un tipo lo informa en vez de inventar", () => {
    const result = recommendBuild(
      answers(),
      parts.filter((part) => part.kind !== "case"),
    );
    expect(result.missing).toEqual(["case"]);
  });

  it("para trabajar no agrega gráfica si el procesador trae gráficos integrados", () => {
    const result = recommendBuild(answers({ use: "work", budget: 4_000_000 }), parts);
    expect(pick(result, "gpu")).toBeUndefined();
    expect(result.notes.join(" ")).toMatch(/gráficos integrados/);
    expect(result.total).toBeLessThanOrEqual(result.towerBudget);
  });

  it("el aviso de presupuesto da el costo real del equipo más económico", () => {
    const result = recommendBuild(answers({ budget: 3_000_000 }), parts);
    // Lo más barato compatible de cada pieza, elegido a mano.
    const cheapest = [849_900, 739_900, 489_900, 1_599_900, 249_900, 119_900, 219_900, 249_900];
    const expected = cheapest.reduce((sum, price) => sum + price, 0);
    expect(result.total).toBe(expected);
    expect(result.notes[0]).toContain(new Intl.NumberFormat("es-CO").format(expected));
  });
});
