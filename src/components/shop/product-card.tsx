import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { isDemoProduct } from "@/features/catalog/availability";
import type { ProductSummary } from "@/features/catalog/types";
import { discountPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

type ProductCardProps = {
  product: ProductSummary;
  /** Solo para las primeras tarjetas visibles al cargar (mejora el LCP). */
  priority?: boolean;
  className?: string;
};

export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const discount = discountPercent(product.price, product.compareAtPrice);
  const outOfStock = product.stock <= 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-[transform,box-shadow,border-color] duration-300 ease-out-soft focus-within:border-primary/40 hover:-translate-y-1 hover:border-primary/40 hover:shadow-raised",
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
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {discount !== null && <Badge>-{discount}%</Badge>}
          {isDemoProduct(product.sku) && <Badge variant="outline">Demo</Badge>}
        </div>
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
          <StockBadge stock={product.stock} lowStockThreshold={product.lowStockThreshold} />
        </div>
      </div>
    </article>
  );
}
