import { FlameIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { isDemoProduct } from "@/features/catalog/availability";
import { rarityStyle } from "@/features/rarities/types";
import type { ProductSummary } from "@/features/catalog/types";
import { categoryTint } from "@/features/catalog/tint";
import { discountPercent, formatWarranty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { ProductFlagTag } from "./product-flag";
import { RarityBadge } from "./rarity-badge";
import { StockBadge } from "./stock-badge";

/** Desde este descuento la etiqueta lleva llama y halo: ofertas que vale la pena resaltar. */
const HOT_DEAL = 20;

type ProductCardProps = {
  product: ProductSummary;
  /** Solo para las primeras tarjetas visibles al cargar (mejora el LCP). */
  priority?: boolean;
  className?: string;
};

/**
 * Tarjeta de producto: especificaciones clave y garantía a la vista. El giro 3D,
 * el reflejo y la pausa de rarezas fuera de pantalla los maneja CardEffects
 * (globals.css: .product-card).
 */
export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const discount = discountPercent(product.price, product.compareAtPrice);
  const outOfStock = product.stock <= 0;
  const warranty = formatWarranty(product.warrantyMonths);
  const { rarity } = product;

  return (
    <article
      data-tilt
      data-effect={rarity?.effect}
      style={rarity ? rarityStyle(rarity) : undefined}
      className={cn(
        "product-card group relative flex flex-col overflow-hidden rounded-2xl border bg-card focus-within:border-primary/50 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow",
        rarity && "rarity-card",
        className,
      )}
    >
      <span aria-hidden className="card-glare" />
      {/* Las rarezas ya tienen su propia luz de borde. */}
      {!rarity && <span aria-hidden className="card-beam" />}

      {/* Cada categoría tiñe el fondo y el dibujo con su tono (categoryTint). */}
      <div
        style={{ "--tint": categoryTint(product.category.slug) } as React.CSSProperties}
        className="relative aspect-[4/3] overflow-hidden bg-secondary bg-[radial-gradient(70%_70%_at_50%_40%,color-mix(in_oklab,var(--tint)_16%,transparent),transparent_72%)]"
      >
        <ProductImage
          image={product.image}
          categorySlug={product.category.slug}
          fallbackAlt={product.name}
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
          priority={priority}
          className={cn(
            "text-[color:color-mix(in_oklab,var(--tint)_40%,var(--muted-foreground))] transition-transform duration-500 ease-out-soft group-hover:scale-105",
            outOfStock && "opacity-60",
          )}
        />
        {/* Una sola fila que se parte en dos si la tarjeta es angosta (móvil). */}
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-1.5">
          {discount !== null && (
            <Badge variant="sale" className={cn(discount >= HOT_DEAL && "gap-1 shadow-sm")}>
              {discount >= HOT_DEAL && <FlameIcon aria-hidden />}-{discount}%
            </Badge>
          )}
          {isDemoProduct(product.sku) && <Badge variant="outline">Demo</Badge>}
          {rarity && <RarityBadge rarity={rarity} className="ml-auto shadow-sm" />}
        </div>
        {product.flag && (
          <ProductFlagTag
            flag={product.flag}
            className="product-flag-edge absolute bottom-3 left-0 z-[1]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate text-eyebrow text-muted-foreground">
          {product.brand?.name ?? product.category.name}
        </p>
        <h3 className="line-clamp-2 font-sans text-[0.9375rem] leading-snug font-semibold font-stretch-normal">
          {/* El enlace cubre toda la tarjeta para ampliar el área de clic. */}
          <Link
            href={`/productos/${product.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
          >
            {product.name}
          </Link>
        </h3>
        {product.keySpecs.length > 0 && (
          <ul aria-label="Especificaciones clave" className="flex flex-wrap gap-1.5">
            {product.keySpecs.map((spec, index) => (
              <li
                key={spec.label}
                title={`${spec.label}: ${spec.text}`}
                // En móvil la tarjeta es angosta: dos bastan.
                className={cn(
                  "max-w-full truncate rounded-md bg-secondary px-2 py-1 font-mono text-[0.6875rem] leading-none text-secondary-foreground",
                  index >= 2 && "hidden sm:block",
                )}
              >
                {spec.text !== spec.label && <span className="sr-only">{spec.label}: </span>}
                {spec.text}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto grid gap-2 pt-1">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} />
          {warranty && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{warranty}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StockBadge stock={product.stock} lowStockThreshold={product.lowStockThreshold} />
            <AddToCartButton
              variant="icon"
              className="ml-auto"
              productId={product.id}
              name={product.name}
              stock={product.stock}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
