export type AvailabilityStatus = "in_stock" | "low_stock" | "out_of_stock";

export type Availability = { status: AvailabilityStatus; label: string };

/** Estado de disponibilidad a partir del stock y el umbral de stock bajo del producto. */
export function getAvailability(stock: number, lowStockThreshold: number): Availability {
  if (stock <= 0) return { status: "out_of_stock", label: "Agotado" };
  if (stock <= lowStockThreshold) {
    return {
      status: "low_stock",
      label: stock === 1 ? "Queda 1 unidad" : `Quedan ${stock} unidades`,
    };
  }
  return { status: "in_stock", label: "En stock" };
}

/** Los datos de demostración usan SKU con prefijo DEMO-; la interfaz los señala. */
export function isDemoProduct(sku: string): boolean {
  return sku.startsWith("DEMO-");
}
