"use client";

import { useSyncExternalStore } from "react";
import { addItem, countUnits, removeItem, sanitizeCart, setQuantity, type CartItem } from "./logic";

/**
 * Carrito persistido en localStorage. Solo guarda IDs y cantidades: precios y
 * stock se consultan siempre al servidor. Se sincroniza entre pestañas.
 */

const STORAGE_KEY = "cart:v1";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let snapshot: CartItem[] | null = null;

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeCart(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(items: CartItem[]) {
  snapshot = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Almacenamiento bloqueado (modo privado): el carrito vive solo en memoria.
  }
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  snapshot = read();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => (snapshot ??= read());
const getServerSnapshot = () => EMPTY;

export const cartActions = {
  add: (productId: string, quantity = 1, max?: number) =>
    write(addItem(getSnapshot(), productId, quantity, max)),
  setQuantity: (productId: string, quantity: number) =>
    write(setQuantity(getSnapshot(), productId, quantity)),
  remove: (productId: string) => write(removeItem(getSnapshot(), productId)),
  clear: () => write(EMPTY),
};

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { items, units: countUnits(items), ...cartActions };
}
