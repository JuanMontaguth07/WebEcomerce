import { describe, expect, it } from "vitest";
import {
  activityHref,
  actorName,
  changeRows,
  describeActivity,
  formatValue,
  referencedIds,
  type ActivityEntry,
} from "./format";

const CATEGORY = "8a6e0804-2bd0-4672-b79d-d97027f9071a";

function entry(overrides: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: 1,
    occurredAt: "2026-10-26T19:30:00Z",
    actorId: "u1",
    actorLabel: "Juan",
    entity: "product",
    action: "update",
    entityId: "p1",
    entityLabel: "RTX 4060",
    changes: null,
    reason: null,
    ...overrides,
  };
}

describe("describeActivity", () => {
  it("resume ediciones frecuentes de productos", () => {
    expect(describeActivity(entry({ changes: { is_active: { old: true, new: false } } }))).toBe(
      "ocultó «RTX 4060» de la tienda",
    );
    expect(describeActivity(entry({ changes: { price: { old: 100, new: 95000 } } }))).toMatch(
      /^cambió el precio de «RTX 4060» a \$\s?95\.000$/,
    );
    expect(
      describeActivity(
        entry({ changes: { price: { old: 1, new: 2 }, name: { old: "a", new: "b" } } }),
      ),
    ).toBe("editó el producto «RTX 4060»");
    expect(describeActivity(entry({ action: "delete" }))).toBe("eliminó el producto «RTX 4060»");
  });

  it("describe pedidos, inventario y configuración", () => {
    expect(
      describeActivity(entry({ entity: "order", action: "create", entityLabel: "#1008" })),
    ).toBe("hizo el pedido #1008");
    expect(
      describeActivity(
        entry({
          entity: "order",
          entityLabel: "#1008",
          changes: { status: { old: "pending", new: "confirmed" } },
        }),
      ),
    ).toBe("cambió el pedido #1008 a confirmado");
    expect(
      describeActivity(
        entry({
          entity: "inventory",
          action: "create",
          changes: { movement_type: "restock", quantity: 5 },
        }),
      ),
    ).toBe("registró reabastecimiento (+5) en «RTX 4060»");
    expect(describeActivity(entry({ entity: "store_settings", entityLabel: null }))).toBe(
      "actualizó la configuración de la tienda",
    );
  });
});

describe("actorName", () => {
  it("distingue al cliente de los procesos automáticos", () => {
    expect(actorName(entry({ actorLabel: null, entity: "order", action: "create" }))).toBe(
      "Cliente",
    );
    expect(actorName(entry({ actorLabel: null, entity: "order" }))).toBe("Sistema");
    expect(actorName(entry({}))).toBe("Juan");
  });
});

describe("changeRows y formatValue", () => {
  it("formatea dinero, booleanos, estados y referencias", () => {
    const names = new Map([[CATEGORY, "Memorias"]]);
    const rows = changeRows(
      entry({
        changes: {
          is_active: { old: false, new: true },
          price: { old: null, new: 95000 },
          category_id: { old: "otra", new: CATEGORY },
        },
      }),
      names,
    );
    expect(rows.map((row) => row.label)).toEqual(["Precio", "Categoría", "Visible"]);
    expect(rows[0]).toMatchObject({ before: "—" });
    expect(rows[1]).toMatchObject({ before: "(eliminada)", after: "Memorias" });
    expect(rows[2]).toMatchObject({ before: "No", after: "Sí" });
  });

  it("en eliminaciones muestra la copia de los datos", () => {
    const rows = changeRows(entry({ action: "delete", changes: { sku: "GPU-1", stock: 3 } }));
    expect(rows).toEqual([
      { field: "sku", label: "SKU", after: "GPU-1" },
      { field: "stock", label: "stock", after: "3" },
    ]);
  });

  it("usa la etiqueta de la ficha técnica tal cual", () => {
    const [row] = changeRows(
      entry({ entity: "product_specs", changes: { "Capacidad (GB)": { old: 8, new: 16 } } }),
    );
    expect(row).toMatchObject({ label: "Capacidad (GB)", before: "8", after: "16" });
  });

  it("acorta textos largos", () => {
    expect(formatValue("description", "x".repeat(300))).toMatch(/… \(300 caracteres\)$/);
  });

  it("reúne ids de categorías y marcas citadas", () => {
    expect(
      referencedIds([
        entry({ changes: { category_id: { old: "a", new: "b" }, name: { old: "x", new: "y" } } }),
        entry({ action: "create", changes: { brand_id: "c" } }),
      ]),
    ).toEqual(["a", "b", "c"]);
  });
});

describe("activityHref", () => {
  it("enlaza solo lo que sigue existiendo", () => {
    const existing = new Set(["p1"]);
    expect(activityHref(entry({ entity: "product_image" }), existing)).toBe("/admin/productos/p1");
    expect(activityHref(entry({ entityId: "borrado" }), existing)).toBeNull();
    expect(activityHref(entry({ entity: "store_settings", entityId: null }), existing)).toBe(
      "/admin/configuracion",
    );
  });
});
