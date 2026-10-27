import { describe, expect, it } from "vitest";
import {
  budgetUsage,
  candidateStatus,
  cartLines,
  choosePart,
  compareParts,
  indexParts,
  isChosen,
  MAX_DRIVES,
  removePart,
  selectedParts,
  selectionTotal,
  toBuild,
} from "./build";
import { DEMO_PARTS } from "./demo-parts";
import { demoArchitectParts, describeSpecs } from "./parts";
import { EMPTY_SELECTION, type ArchitectPart, type Selection } from "./types";

const parts = demoArchitectParts();
const index = indexParts(parts);
const get = (id: string) => index.get(id) as ArchitectPart;

describe("piezas demo", () => {
  it("vienen todas marcadas como demo, sin stock ni ficha en la tienda", () => {
    expect(parts).toHaveLength(DEMO_PARTS.length);
    for (const part of parts) {
      expect(part.demo).toBe(true);
      expect(part.stock).toBeNull();
      expect(part.slug).toBeNull();
      expect(Number.isInteger(part.price)).toBe(true);
    }
  });

  it("usan las etiquetas y unidades de la plantilla", () => {
    const gpu = get("demo-gpu-12");
    expect(gpu.details.find((detail) => detail.key === "length")).toMatchObject({
      label: "Longitud",
      value: "285 mm",
      number: 285,
      unit: "mm",
    });
    expect(gpu.keySpecs.map((spec) => spec.text)).toEqual(["12 GB", "GDDR7", "250 W"]);
  });
});

describe("ficha de productos reales", () => {
  it("prefiere las especificaciones marcadas para la tarjeta", () => {
    const definition = (key: string, position: number, show_on_card = false) => ({
      key,
      label: key,
      group_label: null,
      unit: null,
      data_type: "text" as const,
      position,
      show_on_card,
    });
    const value = { value_number: null, value_boolean: null };
    const described = describeSpecs([
      { ...value, value_text: "A", definition: definition("a", 1) },
      { ...value, value_text: "B", definition: definition("b", 2, true) },
      { ...value, value_text: "C", definition: null },
    ]);
    expect(described.specs).toEqual({ a: "A", b: "B" });
    expect(described.keySpecs.map((spec) => spec.text)).toEqual(["B"]);
    expect(described.details.map((detail) => detail.key)).toEqual(["a", "b"]);
  });
});

describe("selección", () => {
  it("reemplaza la pieza de su tipo y acumula unidades de almacenamiento", () => {
    let selection: Selection = choosePart(EMPTY_SELECTION, get("demo-cpu-6"));
    selection = choosePart(selection, get("demo-cpu-8"));
    expect(selection.parts.cpu).toBe("demo-cpu-8");
    for (let i = 0; i < MAX_DRIVES + 2; i += 1) {
      selection = choosePart(selection, get("demo-ssd-nvme-1t"));
    }
    expect(selection.storage).toHaveLength(MAX_DRIVES);
    selection = removePart(selection, "storage", 1);
    expect(selection.storage).toHaveLength(MAX_DRIVES - 1);
    selection = removePart(selection, "cpu");
    expect(selection.parts.cpu).toBeUndefined();
    expect(isChosen(selection, get("demo-ssd-nvme-1t"))).toBe(true);
  });

  it("suma el total en pesos y lo compara con el presupuesto", () => {
    const selection: Selection = {
      parts: { cpu: "demo-cpu-8", gpu: "demo-gpu-12" },
      storage: ["demo-ssd-nvme-1t", "demo-ssd-nvme-1t"],
    };
    expect(selectionTotal(selection, index)).toBe(1_389_900 + 2_849_900 + 2 * 289_900);
    expect(selectedParts(selection, index).map((part) => part.kind)).toEqual([
      "cpu",
      "gpu",
      "storage",
      "storage",
    ]);
    expect(budgetUsage(4_000_000, 5_000_000)).toEqual({
      percent: 80,
      remaining: 1_000_000,
      over: false,
    });
    expect(budgetUsage(6_000_000, 5_000_000)?.over).toBe(true);
    expect(budgetUsage(1, null)).toBeNull();
  });

  it("arma el equipo para el motor y anticipa si una opción encaja", () => {
    const selection: Selection = { parts: { motherboard: "demo-mb-x870" }, storage: [] };
    expect(Object.keys(toBuild(selection, index))).toEqual(["motherboard"]);
    expect(candidateStatus(selection, index, get("demo-cpu-8"))?.status).toBe("ok");
    const intel = candidateStatus(selection, index, get("demo-cpu-20"));
    expect(intel?.status).toBe("error");
    expect(intel?.message).toContain("LGA1851");
    // Sin otra pieza con qué compararla no hay estado.
    expect(candidateStatus(EMPTY_SELECTION, index, get("demo-cpu-8"))).toBeNull();
  });

  it("al carrito solo van productos reales, agrupados por cantidad", () => {
    const real: ArchitectPart = {
      ...get("demo-ssd-nvme-1t"),
      id: "real-ssd",
      demo: false,
      stock: 5,
    };
    const mixed = indexParts([...parts, real]);
    const selection: Selection = {
      parts: { cpu: "demo-cpu-8" },
      storage: ["real-ssd", "real-ssd"],
    };
    expect(cartLines(selection, mixed)).toEqual([{ part: real, quantity: 2 }]);
  });
});

describe("comparar", () => {
  it("muestra las dos fichas y la diferencia del lado que tiene más", () => {
    const rows = compareParts(get("demo-gpu-12"), get("demo-gpu-8"));
    expect(rows.find((row) => row.key === "vram")).toMatchObject({
      a: "12 GB",
      b: "8 GB",
      difference: { side: "a", text: "4 GB más" },
    });
    expect(rows.find((row) => row.key === "memory_type")?.difference).toBeNull();
  });
});
