import { FlameIcon } from "lucide-react";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { isDemoProduct } from "@/features/catalog/availability";
import { rarityStyle } from "@/features/rarities/types";
import type { ProductSummary } from "@/features/catalog/types";
import { discountPercent } from "@/lib/format";
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

export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const discount = discountPercent(product.price, product.compareAtPrice);
  const outOfStock = product.stock <= 0;
  const { rarity } = product;

  return (
    <article
      data-effect={rarity?.effect}
      style={rarity ? rarityStyle(rarity) : undefined}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-[transform,box-shadow,border-color] duration-300 ease-out-soft focus-within:border-primary/50 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow",
        rarity && "rarity-card",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <ProductImage
          image={product.image}
          categorySlug={product.category.slug}
          fallbackAlt={product.name}
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
          priority={priority}
          className={cn(
            "transition-transform duration-500 ease-out-soft group-hover:scale-105",
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
        <div className="mt-auto grid gap-2 pt-1">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} />
          <div className="flex items-center justify-between gap-2">
            <StockBadge stock={product.stock} lowStockThreshold={product.lowStockThreshold} />
            <AddToCartButton
              variant="icon"
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
