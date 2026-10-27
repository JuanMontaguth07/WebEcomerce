import { describe, expect, it } from "vitest";
import { formatCOP } from "@/lib/format";
import { indexParts } from "./build";
import { demoArchitectParts } from "./parts";
import { buildPayload, quoteMessage, restoreSelection, type SavedBuild } from "./saved";
import type { ArchitectPart, Selection } from "./types";

const demo = demoArchitectParts();
const real: ArchitectPart = {
  ...(demo.find((part) => part.id === "demo-gpu-12") as ArchitectPart),
  id: "1fa6e5f6-68ff-4615-bd8b-e12d55baf775",
  name: "Gráfica real 12 GB",
  demo: false,
  stock: 3,
  slug: "grafica-real",
  price: 2_900_000,
};
const index = indexParts([...demo, real]);

describe("guardar", () => {
  it("manda id de producto para la tienda y nombre y precio solo para las demo", () => {
    const selection: Selection = { parts: { cpu: "demo-cpu-8", gpu: real.id }, storage: [] };
    const payload = buildPayload(selection, index, {
      name: "  Mi PC  ",
      mode: "free",
      source: "catalog",
      budget: 6_000_000,
      answers: null,
      parent_code: null,
    });
    expect(payload.name).toBe("Mi PC");
    expect(payload.components).toEqual([
      {
        kind: "cpu",
        demo_part_id: "demo-cpu-8",
        name: "Procesador demo 8 núcleos AM5",
        price: 1_389_900,
      },
      { kind: "gpu", product_id: real.id },
    ]);
  });
});

describe("abrir una configuración guardada", () => {
  const saved = (components: SavedBuild["components"]): SavedBuild => ({
    code: "AbCdEfGh1234",
    name: "Mi PC",
    mode: "free",
    source: "catalog",
    budget: null,
    total: 0,
    answers: null,
    created_at: "2026-10-27T15:00:00Z",
    parent_code: null,
    components,
  });

  it("restaura las piezas, avisa las que faltan y los precios que cambiaron", () => {
    const restored = restoreSelection(
      saved([
        {
          kind: "gpu",
          product_id: real.id,
          demo_part_id: null,
          name: "Gráfica real 12 GB",
          sku: "X",
          price: 2_500_000,
        },
        {
          kind: "cpu",
          product_id: "00000000-0000-0000-0000-000000000000",
          demo_part_id: null,
          name: "CPU borrada",
          sku: null,
          price: 1,
        },
        {
          kind: "storage",
          product_id: null,
          demo_part_id: "demo-ssd-nvme-1t",
          name: "SSD demo",
          sku: null,
          price: 289_900,
        },
        {
          kind: "storage",
          product_id: null,
          demo_part_id: "demo-ssd-nvme-1t",
          name: "SSD demo",
          sku: null,
          price: 289_900,
        },
      ]),
      index,
    );
    expect(restored.selection).toEqual({
      parts: { gpu: real.id },
      storage: ["demo-ssd-nvme-1t", "demo-ssd-nvme-1t"],
    });
    expect(restored.missing).toEqual(["CPU borrada"]);
    expect(restored.priceChanges).toEqual([
      { name: "Gráfica real 12 GB", before: 2_500_000, now: 2_900_000 },
    ]);
  });

  it("si la pieza cambió de tipo, no la pone en otro lugar", () => {
    const restored = restoreSelection(
      saved([
        {
          kind: "cpu",
          product_id: real.id,
          demo_part_id: null,
          name: "Gráfica real 12 GB",
          sku: null,
          price: 1,
        },
      ]),
      index,
    );
    expect(restored.selection.parts).toEqual({});
    expect(restored.missing).toEqual(["Gráfica real 12 GB"]);
  });
});

describe("cotización por WhatsApp", () => {
  it("lista cada pieza con su precio, el total y el enlace", () => {
    const message = quoteMessage({
      storeName: "Kova Studio",
      name: "Mi PC",
      selection: { parts: { gpu: real.id }, storage: [] },
      index,
      url: "https://tienda.test/arma-tu-pc/AbCdEfGh1234",
    });
    expect(message).toContain("Hola Kova Studio, quiero cotizar");
    expect(message).toContain(`• Tarjeta gráfica: Gráfica real 12 GB (${formatCOP(2_900_000)})`);
    expect(message).toContain(`Total: ${formatCOP(2_900_000)}`);
    expect(message).toContain("Ver el equipo: https://tienda.test/arma-tu-pc/AbCdEfGh1234");
    expect(message).not.toContain("piezas demo");
  });

  it("aclara cuando el equipo es con piezas demo", () => {
    const message = quoteMessage({
      storeName: "Kova Studio",
      name: "Demo",
      selection: { parts: { cpu: "demo-cpu-8" }, storage: [] },
      index,
      url: "https://tienda.test/x",
    });
    expect(message).toContain("piezas demo");
  });
});
