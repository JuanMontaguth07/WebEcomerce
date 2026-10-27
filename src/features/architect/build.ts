import { checkBuild, partStatus } from "@/features/compatibility/engine";
import {
  PART_KINDS,
  type Build,
  type CompatibilityStatus,
  type PartKind,
} from "@/features/compatibility/types";
import type { ArchitectPart, Selection, SingleKind } from "./types";

/** Unidades de almacenamiento que se pueden agregar a un equipo. */
export const MAX_DRIVES = 4;

const SINGLE_KINDS: SingleKind[] = ["cpu", "motherboard", "gpu", "ram", "psu", "cooler", "case"];

export type PartIndex = Map<string, ArchitectPart>;

export const indexParts = (parts: ArchitectPart[]): PartIndex =>
  new Map(parts.map((part) => [part.id, part]));

/** Las piezas elegidas que existen en el índice, en el orden del equipo. */
export function selectedParts(selection: Selection, index: PartIndex): ArchitectPart[] {
  return PART_KINDS.flatMap((kind) => {
    const ids = kind === "storage" ? selection.storage : [selection.parts[kind]];
    return ids.flatMap((id) => (id ? (index.get(id) ?? []) : []));
  });
}

/** El equipo en el formato del motor de compatibilidad. */
export function toBuild(selection: Selection, index: PartIndex): Build {
  const build: Build = {};
  for (const kind of SINGLE_KINDS) {
    const id = selection.parts[kind];
    const part = id ? index.get(id) : undefined;
    if (part) build[kind] = { name: part.name, specs: part.specs };
  }
  const drives = selection.storage.flatMap((id) => index.get(id) ?? []);
  if (drives.length) build.storage = drives.map((part) => ({ name: part.name, specs: part.specs }));
  return build;
}

/** Total en pesos enteros de las piezas elegidas. */
export function selectionTotal(selection: Selection, index: PartIndex): number {
  return selectedParts(selection, index).reduce((sum, part) => sum + part.price, 0);
}

export type BudgetUsage = { percent: number; remaining: number; over: boolean };

/** Cuánto del presupuesto se usa y cuánto queda (negativo si se pasa). */
export function budgetUsage(total: number, budget: number | null): BudgetUsage | null {
  if (!budget || budget <= 0) return null;
  return {
    percent: Math.round((total / budget) * 100),
    remaining: budget - total,
    over: total > budget,
  };
}

/** Elige una pieza: reemplaza la de su tipo o, si es almacenamiento, agrega una unidad. */
export function choosePart(selection: Selection, part: ArchitectPart): Selection {
  if (part.kind === "storage") {
    if (selection.storage.length >= MAX_DRIVES) return selection;
    return { ...selection, storage: [...selection.storage, part.id] };
  }
  return { ...selection, parts: { ...selection.parts, [part.kind]: part.id } };
}

/** Quita la pieza de un tipo; en almacenamiento, la unidad de esa posición. */
export function removePart(selection: Selection, kind: PartKind, position = 0): Selection {
  if (kind === "storage") {
    return { ...selection, storage: selection.storage.filter((_, index) => index !== position) };
  }
  const parts = { ...selection.parts };
  delete parts[kind];
  return { ...selection, parts };
}

export function isChosen(selection: Selection, part: ArchitectPart): boolean {
  return part.kind === "storage"
    ? selection.storage.includes(part.id)
    : selection.parts[part.kind] === part.id;
}

/**
 * Cómo quedaría la compatibilidad de su tipo si se eligiera esta pieza (para
 * marcar las opciones antes de elegirlas). null si no hay con qué compararla.
 */
export function candidateStatus(
  selection: Selection,
  index: PartIndex,
  part: ArchitectPart,
): { status: CompatibilityStatus; message: string } | null {
  const next = isChosen(selection, part) ? selection : choosePart(selection, part);
  const results = checkBuild(toBuild(next, index)).filter((item) => item.parts.includes(part.kind));
  const status = partStatus(results, part.kind);
  if (!status) return null;
  const worst = results.find((item) => item.status === status);
  return { status, message: worst?.message ?? "" };
}

/** Cantidad de cada producto real elegido, para pasarlo al carrito. */
export function cartLines(selection: Selection, index: PartIndex) {
  const lines = new Map<string, { part: ArchitectPart; quantity: number }>();
  for (const part of selectedParts(selection, index)) {
    if (part.demo) continue;
    const line = lines.get(part.id);
    lines.set(part.id, { part, quantity: (line?.quantity ?? 0) + 1 });
  }
  return [...lines.values()];
}

export type ComparisonRow = {
  key: string;
  label: string;
  a: string | null;
  b: string | null;
  /** Diferencia numérica en la unidad de la ficha, del lado que tiene más. */
  difference: { side: "a" | "b"; text: string } | null;
};

const numberFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** Ficha de dos piezas lado a lado, con la diferencia en las que se pueden restar. */
export function compareParts(a: ArchitectPart, b: ArchitectPart): ComparisonRow[] {
  const keys = [...new Set([...a.details, ...b.details].map((detail) => detail.key))];
  return keys.map((key) => {
    const left = a.details.find((detail) => detail.key === key);
    const right = b.details.find((detail) => detail.key === key);
    let difference: ComparisonRow["difference"] = null;
    if (
      left?.number != null &&
      right?.number != null &&
      left.number !== right.number &&
      left.unit === right.unit
    ) {
      const amount = Math.abs(left.number - right.number);
      difference = {
        side: left.number > right.number ? "a" : "b",
        text: `${numberFormat.format(amount)}${left.unit ? ` ${left.unit}` : ""} más`,
      };
    }
    return {
      key,
      label: (left ?? right)?.label ?? key,
      a: left?.value ?? null,
      b: right?.value ?? null,
      difference,
    };
  });
}
