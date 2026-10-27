import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { isDemoProduct } from "@/features/catalog/availability";
import { categoryTint } from "@/features/catalog/tint";
import type { ProductSummary } from "@/features/catalog/types";
import { discountPercent, formatWarranty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

/** Producto destacado en grande: foto amplia, ficha clave a la vista y compra directa. */
export function SpotlightCard({
  product,
  label = "Destacado",
  className,
}: {
  product: ProductSummary;
  label?: string;
  className?: string;
}) {
  const discount = discountPercent(product.price, product.compareAtPrice);
  const warranty = formatWarranty(product.warrantyMonths);

  return (
    <article
      data-tilt
      style={{ "--tint": categoryTint(product.category.slug) } as React.CSSProperties}
      className={cn(
        "product-card group relative grid overflow-hidden rounded-3xl border bg-card hover:border-primary/50 hover:shadow-glow md:grid-cols-[1.15fr_1fr] lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_auto]",
        className,
      )}
    >
      <span aria-hidden className="card-glare" />
      <span aria-hidden className="card-beam" />
      <div className="relative min-h-64 overflow-hidden bg-secondary bg-[radial-gradient(75%_75%_at_50%_45%,color-mix(in_oklab,var(--tint)_22%,transparent),transparent_72%)]">
        <ProductImage
          image={product.image}
          categorySlug={product.category.slug}
          fallbackAlt={product.name}
          sizes="(min-width: 1024px) 40rem, 100vw"
          // El dibujo no pasa de 18rem aunque la tarjeta crezca a la altura de sus vecinas.
          className="p-[10%] text-[color:color-mix(in_oklab,var(--tint)_50%,var(--muted-foreground))] transition-transform duration-700 ease-out-soft group-hover:scale-105 [&_svg]:max-w-72"
        />
        <div className="absolute inset-x-4 top-4 flex flex-wrap gap-1.5">
          <Badge className="bg-primary text-primary-foreground">{label}</Badge>
          {discount !== null && <Badge variant="sale">-{discount}%</Badge>}
          {isDemoProduct(product.sku) && <Badge variant="outline">Demo</Badge>}
        </div>
      </div>
      <div className="grid content-end gap-3 p-5 md:p-6">
        <p className="text-eyebrow text-muted-foreground">
          {product.brand?.name ?? product.category.name}
        </p>
        <h3 className="text-xl leading-snug font-bold md:text-2xl">
          <Link
            href={`/productos/${product.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
          >
            {product.name}
          </Link>
        </h3>
        {product.keySpecs.length > 0 && (
          <ul aria-label="Especificaciones clave" className="flex flex-wrap gap-1.5">
            {product.keySpecs.map((spec) => (
              <li
                key={spec.label}
                title={`${spec.label}: ${spec.text}`}
                className="rounded-lg border bg-background/60 px-2.5 py-1.5 font-mono text-xs"
              >
                {spec.text}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1.5">
            <Price price={product.price} compareAtPrice={product.compareAtPrice} />
            {warranty && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheckIcon className="size-3.5 text-primary" aria-hidden />
                {warranty}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StockBadge stock={product.stock} lowStockThreshold={product.lowStockThreshold} />
            <AddToCartButton
              variant="icon"
              productId={product.id}
              name={product.name}
              stock={product.stock}
            />
          </div>
        </div>
        <span
          aria-hidden
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          Ver producto
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
