import { SparklesIcon } from "lucide-react";
import Link from "next/link";
import { categoryTint } from "@/features/catalog/tint";
import type { ProductSummary } from "@/features/catalog/types";
import { discountPercent, formatCOP } from "@/lib/format";
import type { AppHref } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { FeaturedTabs } from "./featured-tabs";
import { ProductCard } from "./product-card";
import { ProductImage } from "./product-image";
import { ProductRail } from "./product-rail";
import { SectionHeader } from "./section-header";
import { SpotlightCard } from "./spotlight-card";

/**
 * Secciones de la portada, cada una con su propia forma para que no se repita
 * la misma grilla: pestañas con destacado, carrusel, vitrina, ranking y fila
 * compacta. Todas se ocultan solas si no tienen productos.
 */

type Header = { index?: number };

export function FeaturedSection({ products, index }: Header & { products: ProductSummary[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="destacados" className="container-page grid gap-6">
      <SectionHeader
        id="destacados"
        index={index}
        eyebrow="Recomendados"
        title="Selección Kova"
        description="Los componentes y equipos que recomendamos."
        href="/productos"
        linkLabel="Ver catálogo"
        className="reveal"
      />
      <FeaturedTabs products={products} />
    </section>
  );
}

export function DealsSection({ products, index }: Header & { products: ProductSummary[] }) {
  if (!products.length) return null;
  const best = Math.max(
    ...products.map((product) => discountPercent(product.price, product.compareAtPrice) ?? 0),
  );
  return (
    <section
      aria-labelledby="ofertas"
      className="band"
      style={{ "--band": "var(--sale)" } as React.CSSProperties}
    >
      <div className="container-page grid gap-6">
        <SectionHeader
          id="ofertas"
          index={index}
          eyebrow={best > 0 ? `Hasta -${best} %` : "Ofertas"}
          title="Ofertas"
          description="Productos con precio rebajado frente a su precio anterior."
          href="/productos?oferta=1"
          linkLabel="Ver todas las ofertas"
          align="split"
          tone="sale"
        />
        <ProductRail label="Ofertas">
          {products.map((product) => (
            <li key={product.id} className="flex w-64 shrink-0 snap-start sm:w-72">
              <ProductCard product={product} className="w-full" />
            </li>
          ))}
        </ProductRail>
      </div>
    </section>
  );
}

export function PrebuiltSection({
  products,
  index,
  href,
}: Header & { products: ProductSummary[]; href?: AppHref }) {
  const [main, ...others] = products;
  if (!main) return null;
  return (
    <section
      aria-labelledby="computadores"
      className="band"
      style={{ "--band": "var(--tech)" } as React.CSSProperties}
    >
      <div className="container-page grid gap-6">
        <SectionHeader
          id="computadores"
          index={index}
          eyebrow="Listos para usar"
          title="Computadores armados"
          description="Equipos configurados con componentes compatibles entre sí."
          href={href}
          linkLabel="Ver computadores"
        />
        <div className={cn("grid gap-4", others.length && "lg:grid-cols-[1.4fr_1fr]")}>
          <SpotlightCard product={main} label="Equipo armado" />
          {others.length > 0 && (
            <ul className="stagger-in grid content-start gap-3">
              {others.map((product, position) => (
                <li key={product.id} style={{ "--i": position } as React.CSSProperties}>
                  <CompactRow product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export function BestSellersSection({ products, index }: Header & { products: ProductSummary[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="mas-vendidos" className="container-page grid gap-6">
      <SectionHeader
        id="mas-vendidos"
        index={index}
        eyebrow="Últimos 90 días"
        title="Más vendidos"
        description="Lo que más se ha pedido en la tienda."
        align="center"
        className="reveal"
      />
      <ol className="stagger-in grid gap-3 md:grid-cols-2">
        {products.map((product, position) => (
          <li key={product.id} style={{ "--i": position } as React.CSSProperties}>
            <CompactRow product={product} rank={position + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function NewArrivalsSection({ products, index }: Header & { products: ProductSummary[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="nuevos" className="container-page grid gap-6">
      <SectionHeader
        id="nuevos"
        index={index}
        eyebrow="Novedades"
        title="Recién agregados"
        href="/productos?orden=newest"
        linkLabel="Ver novedades"
        className="reveal"
      />
      <ProductRail label="Recién agregados">
        {products.map((product) => (
          <li key={product.id} className="w-72 shrink-0 snap-start sm:w-80">
            <CompactRow product={product} badge="Nuevo" />
          </li>
        ))}
      </ProductRail>
    </section>
  );
}

/** Fila compacta: miniatura, nombre, ficha clave y precio. Para listas y rankings. */
function CompactRow({
  product,
  rank,
  badge,
}: {
  product: ProductSummary;
  rank?: number;
  badge?: string;
}) {
  return (
    <article
      style={{ "--tint": categoryTint(product.category.slug) } as React.CSSProperties}
      className="group relative flex h-full items-center gap-4 rounded-2xl border bg-card p-3 transition-[border-color,box-shadow] duration-300 ease-out-soft hover:border-primary/50 hover:shadow-glow"
    >
      {rank !== undefined && (
        <span
          aria-hidden
          className="w-12 shrink-0 text-center font-heading text-4xl leading-none font-extrabold text-primary/80 font-stretch-112% tabular-nums"
        >
          {String(rank).padStart(2, "0")}
        </span>
      )}
      <span className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-secondary bg-[radial-gradient(70%_70%_at_50%_45%,color-mix(in_oklab,var(--tint)_22%,transparent),transparent_75%)]">
        <ProductImage
          image={product.image}
          categorySlug={product.category.slug}
          fallbackAlt={product.name}
          sizes="5rem"
          className="p-2 text-[color:color-mix(in_oklab,var(--tint)_50%,var(--muted-foreground))] transition-transform duration-500 ease-out-soft group-hover:scale-110"
        />
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="flex items-center gap-2 text-eyebrow text-muted-foreground">
          {badge && (
            <span className="inline-flex items-center gap-1 text-primary">
              <SparklesIcon className="size-3" aria-hidden />
              {badge}
            </span>
          )}
          <span className="truncate">{product.brand?.name ?? product.category.name}</span>
        </span>
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold">
          {rank !== undefined && <span className="sr-only">Puesto {rank}: </span>}
          <Link
            href={`/productos/${product.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
          >
            {product.name}
          </Link>
        </h3>
        {product.keySpecs.length > 0 && (
          <span className="truncate font-mono text-[0.6875rem] text-muted-foreground">
            {product.keySpecs
              .slice(0, 2)
              .map((spec) => spec.text)
              .join(" · ")}
          </span>
        )}
        <span className="font-heading text-base font-bold font-stretch-112% tabular-nums">
          {formatCOP(product.price)}
        </span>
      </span>
    </article>
  );
}
