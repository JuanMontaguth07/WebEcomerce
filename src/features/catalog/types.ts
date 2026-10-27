import type { ProductFlag } from "@/features/flags/types";
import type { Rarity } from "@/features/rarities/types";
import type { Database } from "@/lib/supabase/database.types";

import type { PartKind } from "@/features/compatibility/types";

export type ProductType = Database["public"]["Enums"]["product_type"];
export type SpecDataType = Database["public"]["Enums"]["spec_data_type"];

export type CategoryRef = { name: string; slug: string };
export type BrandRef = { name: string; slug: string };
export type ImageRef = { path: string; alt: string };

/** Datos mínimos para mostrar un producto en listados y tarjetas. */
export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  productType: ProductType;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  brand: BrandRef | null;
  category: CategoryRef;
  image: ImageRef | null;
  /** Nivel visual asignado en el panel (null = producto normal). */
  rarity: Rarity | null;
  /** Bandera de marca o línea (NVIDIA, AMD Ryzen…), o null. */
  flag: ProductFlag | null;
  warrantyMonths: number | null;
  /** Hasta 3 especificaciones marcadas «en la tarjeta» en la ficha de su categoría. */
  keySpecs: CardSpec[];
};

/** Especificación corta de la tarjeta: «12 GB», «8 núcleos». `label` es su nombre completo. */
export type CardSpec = { label: string; text: string };

export type Category = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Foto subida desde el panel; sin ella se usa la ilustración. */
  imagePath: string | null;
  /** Pieza que representa en Kova Architect (solo la propia; las hijas pueden heredarla). */
  architectPart: PartKind | null;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Logo subido desde el panel; sin él se muestra el nombre. */
  logoPath: string | null;
};

export type ProductSpec = {
  key: string;
  label: string;
  group: string;
  value: string;
};

export type ProductImage = {
  id: string;
  path: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export type ProductDetail = ProductSummary & {
  description: string | null;
  /** Por qué es una pieza única (null = producto normal). */
  uniqueNote: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  parentCategory: CategoryRef | null;
  images: ProductImage[];
  specs: ProductSpec[];
};

export type CatalogFacets = {
  total: number;
  minPrice: number | null;
  maxPrice: number | null;
  brands: { slug: string; name: string; count: number }[];
};
