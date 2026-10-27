import type { CardSpec, ImageRef } from "@/features/catalog/types";
import type { PartKind, PartSpecs } from "@/features/compatibility/types";

/** Pieza que ofrece el configurador: un producto del catálogo o una pieza demo. */
export type ArchitectPart = {
  id: string;
  kind: PartKind;
  name: string;
  brand: string | null;
  /** Precio en COP (entero). En las piezas demo es de ejemplo. */
  price: number;
  /** null en las piezas demo: no tienen inventario ni se pueden comprar. */
  stock: number | null;
  lowStockThreshold: number;
  /** Ficha del producto en la tienda (null en las demo). */
  slug: string | null;
  image: ImageRef | null;
  demo: boolean;
  /** Valores tal como están en la ficha, para el motor de compatibilidad. */
  specs: PartSpecs;
  /** Ficha legible en su orden, para comparar. */
  details: PartDetail[];
  /** Hasta 3 especificaciones cortas para la lista. */
  keySpecs: CardSpec[];
};

export type PartDetail = {
  key: string;
  label: string;
  value: string;
  /** Valor numérico y unidad, para calcular diferencias al comparar. */
  number: number | null;
  unit: string | null;
};

export type SingleKind = Exclude<PartKind, "storage">;

/** Piezas elegidas: una por tipo y hasta MAX_DRIVES unidades de almacenamiento. */
export type Selection = {
  parts: Partial<Record<SingleKind, string>>;
  storage: string[];
};

export const EMPTY_SELECTION: Selection = { parts: {}, storage: [] };
