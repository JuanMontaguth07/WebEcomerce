import { asPartKind, type PartKind } from "@/features/compatibility/types";
import { choosePart } from "./build";
import { EMPTY_SELECTION, type ArchitectPart, type Selection } from "./types";

export type EntryState = {
  mode: "free";
  source: "catalog";
  selection: Selection;
  active: PartKind;
};

/**
 * Entradas desde la tienda: `?pieza=<producto>` (ficha: «Usar en Arma tu PC»)
 * abre el modo libre con ese producto ya puesto; `?tipo=<pieza>` (categoría)
 * abre en esa pieza. Lo que no se reconoce se ignora.
 */
export function entryFromParams(
  params: { get: (key: string) => string | null },
  catalogParts: ArchitectPart[],
): EntryState | null {
  const productId = params.get("pieza");
  const part = productId ? catalogParts.find((item) => item.id === productId) : undefined;
  if (part) {
    return {
      mode: "free",
      source: "catalog",
      selection: choosePart(EMPTY_SELECTION, part),
      active: part.kind,
    };
  }
  const kind = asPartKind(params.get("tipo"));
  if (kind && catalogParts.some((item) => item.kind === kind)) {
    return { mode: "free", source: "catalog", selection: EMPTY_SELECTION, active: kind };
  }
  return null;
}
