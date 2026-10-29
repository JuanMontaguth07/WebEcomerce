import { describe, expect, it } from "vitest";
import { assessProduct, MIN_DESCRIPTION, type QualityInput } from "./quality";

const complete: QualityInput = {
  price: 1_899_900,
  stock: 4,
  isActive: true,
  brandId: "amd",
  warrantyMonths: 36,
  shortDescription: "8 núcleos con 3D V-Cache para jugar.",
  description: "x".repeat(MIN_DESCRIPTION),
  images: [{ alt: "Frente" }, { alt: "Caja" }],
  filledSpecs: new Set(["cores", "socket"]),
  categorySpecs: [
    { id: "cores", key: "cores", showOnCard: true },
    { id: "socket", key: "socket", showOnCard: false },
  ],
  architectKeys: new Set(["socket"]),
};

describe("calidad del catálogo", () => {
  it("un producto completo tiene 100 y ningún pendiente", () => {
    expect(assessProduct(complete)).toEqual({ issues: [], score: 100 });
  });

  it("lo recién importado sin nada más baja mucho y dice por qué, lo grave primero", () => {
    const result = assessProduct({
      ...complete,
      isActive: false,
      brandId: null,
      warrantyMonths: null,
      shortDescription: null,
      description: null,
      images: [],
      filledSpecs: new Set(),
    });
    expect(result.issues).toEqual([
      "no_images",
      "card_specs",
      "specs",
      "no_short",
      "thin_description",
      "architect",
      "no_brand",
      "no_warranty",
    ]);
    expect(result.score).toBeLessThan(25);
  });

  it("avisa de lo que se ve mal en la tienda: agotado visible, una foto, sin texto alternativo", () => {
    const result = assessProduct({ ...complete, stock: 0, images: [{ alt: "" }] });
    expect(result.issues).toEqual(["visible_out", "one_image", "alt_text"]);
  });

  it("marca precios sospechosos y productos listos que siguen ocultos", () => {
    expect(assessProduct({ ...complete, price: 1_900 }).issues).toEqual(["price"]);
    expect(assessProduct({ ...complete, isActive: false }).issues).toEqual(["hidden_ready"]);
  });

  it("sin ficha definida en la categoría no exige ficha", () => {
    const result = assessProduct({ ...complete, categorySpecs: [], filledSpecs: new Set() });
    expect(result).toEqual({ issues: [], score: 100 });
  });
});
