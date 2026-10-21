import type { CartItem } from "./logic";

export type QuotableProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  categorySlug: string;
  image: { path: string; alt: string } | null;
};

export type QuoteLineStatus = "ok" | "insufficient_stock" | "unavailable";

export type QuoteLine = {
  productId: string;
  requested: number;
  status: QuoteLineStatus;
  product: QuotableProduct | null;
  /** Unidades que se pueden comprar ahora (0 si no disponible). */
  available: number;
  lineTotal: number;
};

export type CartQuote = {
  lines: QuoteLine[];
  subtotal: number;
  units: number;
  /** true si todas las líneas pueden comprarse tal como están. */
  ready: boolean;
};

/**
 * Cruza el carrito con los productos actuales de la base de datos. El precio
 * siempre viene del servidor; el carrito solo aporta IDs y cantidades.
 */
export function buildQuote(items: CartItem[], products: QuotableProduct[]): CartQuote {
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines = items.map((item): QuoteLine => {
    const product = byId.get(item.productId) ?? null;
    if (!product || product.stock <= 0) {
      return {
        productId: item.productId,
        requested: item.quantity,
        status: "unavailable",
        product,
        available: 0,
        lineTotal: 0,
      };
    }
    const status: QuoteLineStatus = item.quantity > product.stock ? "insufficient_stock" : "ok";
    return {
      productId: item.productId,
      requested: item.quantity,
      status,
      product,
      available: product.stock,
      lineTotal: status === "ok" ? product.price * item.quantity : 0,
    };
  });

  const okLines = lines.filter((line) => line.status === "ok");
  return {
    lines,
    subtotal: okLines.reduce((total, line) => total + line.lineTotal, 0),
    units: okLines.reduce((total, line) => total + line.requested, 0),
    ready: lines.length > 0 && okLines.length === lines.length,
  };
}
