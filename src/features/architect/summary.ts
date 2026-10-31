import { PART_KINDS, type PartKind } from "@/features/compatibility/types";
import { textSpec } from "@/features/compatibility/values";
import type { ArchitectPart } from "./types";

export type CatalogSummary = {
  total: number;
  /** Piezas de cada tipo (0 si no hay). */
  byKind: Record<PartKind, number>;
  /** Sockets de procesador que hay, en orden. */
  sockets: string[];
  /** Marcas de las piezas, de la que más tiene a la que menos. */
  brands: { name: string; count: number }[];
};

/** Lo que muestra la portada de Arma tu PC: cuántas piezas, de qué tipo, sockets y marcas. */
export function catalogSummary(parts: ArchitectPart[]): CatalogSummary {
  const byKind = Object.fromEntries(PART_KINDS.map((kind) => [kind, 0])) as Record<
    PartKind,
    number
  >;
  const sockets = new Set<string>();
  const brands = new Map<string, number>();
  for (const part of parts) {
    byKind[part.kind] += 1;
    if (part.kind === "cpu") {
      const socket = textSpec(part.specs, "socket");
      if (socket) sockets.add(socket.toUpperCase().replace(/\s+/g, ""));
    }
    if (part.brand) brands.set(part.brand, (brands.get(part.brand) ?? 0) + 1);
  }
  return {
    total: parts.length,
    byKind,
    sockets: [...sockets].sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
    brands: [...brands]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es")),
  };
}
