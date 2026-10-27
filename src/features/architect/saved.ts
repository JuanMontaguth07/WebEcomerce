import { PART_KINDS, PART_LABELS, type PartKind } from "@/features/compatibility/types";
import { formatCOP } from "@/lib/format";
import { selectedParts, type PartIndex } from "./build";
import type { GuidedAnswers } from "./guided";
import { EMPTY_SELECTION, type Selection } from "./types";

/** Código del enlace para compartir (lo genera save_build). */
export const SHARE_CODE = /^[A-Za-z0-9]{12}$/;

export type BuildMode = "guided" | "free";
export type BuildSource = "catalog" | "demo";

/** Una configuración guardada, tal como la devuelve get_build. */
export type SavedBuild = {
  code: string;
  name: string;
  mode: BuildMode;
  source: BuildSource;
  budget: number | null;
  total: number;
  answers: GuidedAnswers | null;
  created_at: string;
  parent_code: string | null;
  components: {
    kind: PartKind;
    product_id: string | null;
    demo_part_id: string | null;
    name: string;
    sku: string | null;
    price: number;
  }[];
};

export type SavePayload = {
  name: string;
  mode: BuildMode;
  source: BuildSource;
  budget: number | null;
  answers: GuidedAnswers | null;
  parent_code: string | null;
  components: (
    | { kind: PartKind; product_id: string }
    | { kind: PartKind; demo_part_id: string; name: string; price: number }
  )[];
};

/** Lo que se envía a save_build. Los precios de la tienda los pone la base. */
export function buildPayload(
  selection: Selection,
  index: PartIndex,
  meta: Omit<SavePayload, "components" | "source"> & { source: BuildSource },
): SavePayload {
  return {
    ...meta,
    name: meta.name.trim(),
    components: selectedParts(selection, index).map((part) =>
      part.demo
        ? { kind: part.kind, demo_part_id: part.id, name: part.name, price: part.price }
        : { kind: part.kind, product_id: part.id },
    ),
  };
}

export type RestoredBuild = {
  selection: Selection;
  /** Piezas que ya no están en el catálogo (o dejaron de tener ficha). */
  missing: string[];
  /** Piezas cuyo precio cambió desde que se guardó. */
  priceChanges: { name: string; before: number; now: number }[];
};

/** Vuelve a armar la selección con las piezas que siguen disponibles. */
export function restoreSelection(saved: SavedBuild, index: PartIndex): RestoredBuild {
  let selection: Selection = EMPTY_SELECTION;
  const missing: string[] = [];
  const priceChanges: RestoredBuild["priceChanges"] = [];
  for (const component of saved.components) {
    const id = component.product_id ?? component.demo_part_id;
    const part = id ? index.get(id) : undefined;
    if (!part || part.kind !== component.kind) {
      missing.push(component.name);
      continue;
    }
    if (part.price !== component.price) {
      priceChanges.push({ name: part.name, before: component.price, now: part.price });
    }
    selection =
      part.kind === "storage"
        ? { ...selection, storage: [...selection.storage, part.id] }
        : { ...selection, parts: { ...selection.parts, [part.kind]: part.id } };
  }
  return { selection, missing, priceChanges };
}

/** Mensaje de WhatsApp para pedir la cotización de un equipo guardado. */
export function quoteMessage({
  storeName,
  name,
  selection,
  index,
  url,
}: {
  storeName: string;
  name: string;
  selection: Selection;
  index: PartIndex;
  url: string;
}): string {
  const parts = selectedParts(selection, index);
  const demo = parts.some((part) => part.demo);
  const lines = PART_KINDS.flatMap((kind) =>
    parts
      .filter((part) => part.kind === kind)
      .map((part) => `• ${PART_LABELS[kind]}: ${part.name} (${formatCOP(part.price)})`),
  );
  const total = parts.reduce((sum, part) => sum + part.price, 0);
  return [
    `Hola ${storeName}, quiero cotizar este equipo armado en Arma tu PC: «${name}».`,
    ...(demo ? ["(Lo armé con piezas demo para tener una idea.)"] : []),
    "",
    ...lines,
    "",
    `Total: ${formatCOP(total)}`,
    `Ver el equipo: ${url}`,
  ].join("\n");
}
