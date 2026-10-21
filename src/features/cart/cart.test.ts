import { describe, expect, it } from "vitest";
import { addItem, countUnits, MAX_LINES, removeItem, sanitizeCart, setQuantity } from "./logic";
import { buildQuote, type QuotableProduct } from "./quote";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("operaciones del carrito", () => {
  it("agrega, acumula y respeta el stock conocido", () => {
    let items = addItem([], A, 2);
    items = addItem(items, A, 3);
    expect(items).toEqual([{ productId: A, quantity: 5 }]);
    expect(addItem(items, A, 10, 6)).toEqual([{ productId: A, quantity: 6 }]);
  });

  it("limita cantidades a 1–99 y la cantidad de productos distintos", () => {
    expect(addItem([], A, 500)[0]?.quantity).toBe(99);
    expect(addItem([], A, 0)[0]?.quantity).toBe(1);
    const full = Array.from({ length: MAX_LINES }, (_, i) => ({
      productId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      quantity: 1,
    }));
    expect(addItem(full, A)).toHaveLength(MAX_LINES);
  });

  it("cambia cantidades y elimina con cero", () => {
    const items = [
      { productId: A, quantity: 2 },
      { productId: B, quantity: 1 },
    ];
    expect(setQuantity(items, A, 7)[0]?.quantity).toBe(7);
    expect(setQuantity(items, A, 0)).toEqual([{ productId: B, quantity: 1 }]);
    expect(removeItem(items, B)).toEqual([{ productId: A, quantity: 2 }]);
    expect(countUnits(items)).toBe(3);
  });
});

describe("sanitizeCart", () => {
  it("descarta datos inválidos o manipulados del almacenamiento", () => {
    expect(sanitizeCart("basura")).toEqual([]);
    expect(
      sanitizeCart([
        { productId: A, quantity: 2 },
        { productId: A, quantity: 5 },
        { productId: "no-uuid", quantity: 1 },
        { productId: B, quantity: -3 },
        { productId: C, quantity: 1e9 },
        { productId: B, quantity: "7" },
        null,
      ]),
    ).toEqual([
      { productId: A, quantity: 2 },
      { productId: C, quantity: 99 },
    ]);
  });
});

describe("buildQuote", () => {
  const product = (id: string, price: number, stock: number): QuotableProduct => ({
    id,
    name: id,
    slug: id,
    sku: id,
    price,
    compareAtPrice: null,
    stock,
    categorySlug: "x",
    image: null,
  });

  it("usa precios del servidor y calcula el subtotal", () => {
    const quote = buildQuote(
      [
        { productId: A, quantity: 2 },
        { productId: B, quantity: 1 },
      ],
      [product(A, 100_000, 5), product(B, 50_000, 1)],
    );
    expect(quote.subtotal).toBe(250_000);
    expect(quote.units).toBe(3);
    expect(quote.ready).toBe(true);
  });

  it("marca stock insuficiente y productos no disponibles", () => {
    const quote = buildQuote(
      [
        { productId: A, quantity: 4 },
        { productId: B, quantity: 1 },
        { productId: C, quantity: 1 },
      ],
      [product(A, 100_000, 2), product(B, 50_000, 0)],
    );
    expect(quote.lines.map((line) => line.status)).toEqual([
      "insufficient_stock",
      "unavailable",
      "unavailable",
    ]);
    expect(quote.lines[0]?.available).toBe(2);
    expect(quote.subtotal).toBe(0);
    expect(quote.ready).toBe(false);
  });

  it("un carrito vacío no está listo para comprar", () => {
    expect(buildQuote([], []).ready).toBe(false);
  });
});
