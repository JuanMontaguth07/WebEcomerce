"use client";

import { createContext, use, useState } from "react";
import { ProductCard } from "@/components/shop/product-card";
import type { CardSpec, ImageRef, ProductSummary } from "@/features/catalog/types";
import type { AdminFlag } from "@/features/flags/queries";
import type { AdminRarity } from "@/features/rarities/queries";
import type { ProductFormValues } from "./product-form";

type Draft = [ProductFormValues, React.Dispatch<React.SetStateAction<ProductFormValues>>];

const DraftContext = createContext<Draft | null>(null);

/** El formulario del producto lo usa si existe; así la vista previa lo ve mientras se escribe. */
export function useProductDraft(): Draft | null {
  return use(DraftContext);
}

export function ProductDraftProvider({
  initial,
  children,
}: {
  initial: ProductFormValues;
  children: React.ReactNode;
}) {
  const draft = useState(initial);
  return <DraftContext value={draft}>{children}</DraftContext>;
}

const amount = (value: string) => {
  const number = Number(value.replace(/\D/g, ""));
  return Number.isFinite(number) ? number : 0;
};

/**
 * La tarjeta de la tienda con lo que hay en el formulario (sin guardar), la
 * foto principal y los datos de la ficha que van en la tarjeta. No se puede
 * tocar: es solo para ver.
 */
export function ProductCardPreview({
  categories,
  brands,
  rarities,
  flags,
  image,
  keySpecs,
  stock,
}: {
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
  rarities: AdminRarity[];
  flags: AdminFlag[];
  image: ImageRef | null;
  keySpecs: CardSpec[];
  stock: number;
}) {
  const draft = useProductDraft();
  if (!draft) return null;
  const [values] = draft;
  const category = categories.find((item) => item.id === values.categoryId);
  const brand = brands.find((item) => item.id === values.brandId);
  const compareAtPrice = amount(values.compareAtPrice);

  const product: ProductSummary = {
    id: "vista-previa",
    name: values.name.trim() || "Nombre del producto",
    slug: values.slug || "vista-previa",
    sku: values.sku,
    productType: values.productType,
    shortDescription: values.shortDescription || null,
    price: amount(values.price),
    compareAtPrice: compareAtPrice || null,
    stock,
    lowStockThreshold: amount(values.lowStockThreshold),
    brand: brand ? { name: brand.name, slug: brand.slug } : null,
    category: category
      ? { name: category.name, slug: category.slug }
      : { name: "Sin categoría", slug: "" },
    image,
    rarity: rarities.find((item) => item.id === values.rarityId) ?? null,
    flag: flags.find((item) => item.id === values.flagId) ?? null,
    warrantyMonths: values.warrantyMonths === "" ? null : amount(values.warrantyMonths),
    keySpecs,
  };

  return (
    <figure className="grid gap-3">
      {/* Solo para ver: ni el enlace ni el carrito responden. */}
      <div inert className="pointer-events-none mx-auto w-full max-w-72 select-none">
        <ProductCard product={product} />
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Se actualiza mientras escribes.
        {!image && " Sin foto se ve la ilustración de la categoría."}
        {!values.isActive && " Ahora está oculto: los clientes no lo ven."}
      </figcaption>
    </figure>
  );
}
