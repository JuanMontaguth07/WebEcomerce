import { InfoIcon, MessageCircleIcon, ShieldCheckIcon, SparklesIcon, TagIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductGallery } from "@/components/product/product-gallery";
import { SpecTable } from "@/components/product/spec-table";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { HomeSection } from "@/components/shop/home-section";
import { Price } from "@/components/shop/price";
import { ProductFlagTag } from "@/components/shop/product-flag";
import { RarityBadge } from "@/components/shop/rarity-badge";
import { StockBadge } from "@/components/shop/stock-badge";
import { rarityStyle } from "@/features/rarities/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAvailability, isDemoProduct } from "@/features/catalog/availability";
import {
  getActiveProductSlugs,
  getProductBySlug,
  getRelatedProducts,
} from "@/features/catalog/queries";
import { productJsonLd } from "@/features/catalog/structured-data";
import type { ProductDetail } from "@/features/catalog/types";
import { getStoreSettings } from "@/features/store-settings/queries";
import { whatsappLink } from "@/features/store-settings/types";
import { storageImageUrl } from "@/lib/images";
import { absoluteUrl, baseOpenGraph } from "@/lib/seo";
import { slugParams } from "@/lib/static-params";

// Se prerenderizan los productos más recientes; el resto se genera en la primera visita.
export async function generateStaticParams() {
  const products = await getActiveProductSlugs();
  return slugParams(products.slice(0, 200).map(({ slug }) => slug));
}

export async function generateMetadata({
  params,
}: PageProps<"/productos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado", robots: { index: false } };

  const title = product.seoTitle ?? product.name;
  const description =
    product.seoDescription ??
    product.shortDescription ??
    `${product.name} en ${product.category.name}. Ficha técnica, precio y disponibilidad.`;
  const image = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: {
      ...baseOpenGraph,
      title,
      description,
      url: `/productos/${product.slug}`,
      images: image
        ? [
            {
              url: storageImageUrl(image.path),
              alt: image.alt,
              ...(image.width && image.height ? { width: image.width, height: image.height } : {}),
            },
          ]
        : baseOpenGraph.images,
    },
  };
}

function warrantyLabel(months: number | null) {
  if (!months) return null;
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? "año" : "años"} de garantía`;
  }
  return `${months} meses de garantía`;
}

function ProductInfo({
  product,
  whatsappNumber,
}: {
  product: ProductDetail;
  whatsappNumber: string | null;
}) {
  const availability = getAvailability(product.stock, product.lowStockThreshold);
  const warranty = warrantyLabel(product.warrantyMonths);

  return (
    <div className="grid content-start gap-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {product.flag && (
            <ProductFlagTag flag={product.flag} size="lg" className="rounded-l-md" />
          )}
          {product.brand ? (
            <Link
              href={`/marcas/${product.brand.slug}`}
              className="w-fit text-eyebrow text-primary hover:underline"
            >
              {product.brand.name}
            </Link>
          ) : (
            <span className="text-eyebrow text-muted-foreground">{product.category.name}</span>
          )}
        </div>
        <h1 className="text-3xl leading-tight font-extrabold font-stretch-112% md:text-4xl">
          {product.name}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          SKU <span className="text-foreground select-all">{product.sku}</span>
        </p>
      </div>

      {product.rarity && (
        <div
          data-effect={product.rarity.effect}
          style={rarityStyle(product.rarity)}
          className="rarity-card relative flex items-center gap-4 overflow-hidden rounded-xl border bg-card p-4"
        >
          <RarityBadge rarity={product.rarity} size="lg" />
          <p className="grid min-w-0 gap-0.5 text-sm">
            <span className="font-semibold">Calidad {product.rarity.name.toLowerCase()}</span>
            {product.rarity.description && (
              <span className="text-muted-foreground">{product.rarity.description}</span>
            )}
          </p>
        </div>
      )}

      {product.uniqueNote && (
        <p className="flex gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4 text-sm">
          <SparklesIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span className="grid gap-0.5">
            <span className="font-semibold">Pieza única</span>
            <span>{product.uniqueNote}</span>
          </span>
        </p>
      )}

      {isDemoProduct(product.sku) && (
        <p className="flex gap-2.5 rounded-lg border border-dashed bg-secondary/60 p-3 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Producto de demostración: la marca, el precio y el inventario son ficticios.
        </p>
      )}

      <div className="grid gap-3 border-y py-5">
        <Price price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
        <div className="flex flex-wrap items-center gap-3">
          <StockBadge stock={product.stock} lowStockThreshold={product.lowStockThreshold} />
          {availability.status === "out_of_stock" && (
            <span className="text-sm text-muted-foreground">
              Sin unidades por ahora. Revisa productos similares más abajo.
            </span>
          )}
        </div>
        <AddToCartButton productId={product.id} name={product.name} stock={product.stock} />
        {whatsappNumber && (
          <Button asChild variant="secondary" className="w-fit">
            <a
              href={whatsappLink(
                whatsappNumber,
                `Hola, me interesa este producto: ${product.name} (SKU ${product.sku}). ${absoluteUrl(`/productos/${product.slug}`)}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircleIcon aria-hidden />
              Preguntar por WhatsApp
            </a>
          </Button>
        )}
      </div>

      {product.shortDescription && <p className="text-lg">{product.shortDescription}</p>}

      <ul className="grid gap-3 text-sm">
        {warranty && (
          <li className="flex items-center gap-3">
            <ShieldCheckIcon className="size-5 text-primary" aria-hidden />
            {warranty}
          </li>
        )}
        <li className="flex items-center gap-3">
          <TagIcon className="size-5 text-primary" aria-hidden />
          <span>
            Categoría:{" "}
            <Link
              href={`/categorias/${product.category.slug}`}
              className="font-medium hover:underline"
            >
              {product.category.name}
            </Link>
          </span>
        </li>
      </ul>
    </div>
  );
}

async function RelatedProducts({ product }: { product: ProductDetail }) {
  const related = await getRelatedProducts(product.id, product.category.slug);
  return (
    <HomeSection
      id="relacionados"
      title="Productos relacionados"
      href={`/categorias/${product.category.slug}`}
      linkLabel={`Ver más en ${product.category.name}`}
      products={related}
    />
  );
}

async function ProductContent({ params }: PageProps<"/productos/[slug]">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getStoreSettings()]);
  if (!product) notFound();

  const paragraphs = (product.description ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <div className="container-page grid gap-6 pt-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            ...(product.parentCategory
              ? [
                  {
                    name: product.parentCategory.name,
                    href: `/categorias/${product.parentCategory.slug}` as const,
                  },
                ]
              : []),
            { name: product.category.name, href: `/categorias/${product.category.slug}` },
            { name: product.name },
          ]}
        />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery
            images={product.images}
            productName={product.name}
            categorySlug={product.category.slug}
          />
          <ProductInfo product={product} whatsappNumber={settings.whatsappNumber} />
        </div>
      </div>

      {product.specs.length > 0 && (
        <section aria-labelledby="especificaciones" className="container-page grid gap-6">
          <h2 id="especificaciones" className="text-2xl font-bold md:text-3xl">
            Especificaciones técnicas
          </h2>
          <SpecTable specs={product.specs} />
        </section>
      )}

      {paragraphs.length > 0 && (
        <section aria-labelledby="descripcion" className="container-page grid gap-4">
          <h2 id="descripcion" className="text-2xl font-bold md:text-3xl">
            Descripción
          </h2>
          <div className="grid max-w-3xl gap-4 text-muted-foreground">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      <Suspense>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page grid gap-6 pt-8" aria-busy>
      <span className="sr-only">Cargando producto…</span>
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="grid content-start gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-10 w-48" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    </div>
  );
}

export default function ProductPage(props: PageProps<"/productos/[slug]">) {
  return (
    <main id="contenido" className="grid gap-14 pb-8">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent {...props} />
      </Suspense>
    </main>
  );
}
