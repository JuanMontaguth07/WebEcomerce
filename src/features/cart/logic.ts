/**
 * Lógica pura del carrito (sin React ni almacenamiento): fácil de probar y
 * compartida entre el navegador y el servidor.
 */

export type CartItem = { productId: string; quantity: number };

export const MAX_QUANTITY = 99;
export const MAX_LINES = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clamp = (value: number, max = MAX_QUANTITY) =>
  Math.max(1, Math.min(Math.floor(value), max, MAX_QUANTITY));

/** Agrega unidades; si se indica `max` (stock conocido), no lo supera. */
export function addItem(
  items: CartItem[],
  productId: string,
  quantity = 1,
  max?: number,
): CartItem[] {
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    return items.map((item) =>
      item.productId === productId
        ? { ...item, quantity: clamp(item.quantity + quantity, max) }
        : item,
    );
  }
  if (items.length >= MAX_LINES) return items;
  return [...items, { productId, quantity: clamp(quantity, max) }];
}

export function setQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeItem(items, productId);
  return items.map((item) =>
    item.productId === productId ? { ...item, quantity: clamp(quantity) } : item,
  );
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

export function countUnits(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

/** Lee un carrito guardado descartando cualquier dato inválido o manipulado. */
export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const result: CartItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { productId, quantity } = entry as Record<string, unknown>;
    if (typeof productId !== "string" || !UUID.test(productId)) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1) continue;
    if (result.some((item) => item.productId === productId)) continue;
    result.push({ productId, quantity: clamp(quantity) });
    if (result.length >= MAX_LINES) break;
  }
  return result;
}
