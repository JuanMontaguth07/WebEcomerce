import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutSection } from "@/components/shop/about-section";
import { Benefits } from "@/components/shop/benefits";
import { CategoryGrid } from "@/components/shop/category-grid";
import { Hero } from "@/components/shop/hero";
import { HomeSection } from "@/components/shop/home-section";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductGridSkeleton } from "@/components/shop/product-grid";
import { RarityShowcase } from "@/components/shop/rarity-showcase";
import { siteConfig } from "@/config/site";
import {
  getBestSellers,
  getCategories,
  getHomeCollection,
  getProductBySlug,
  getRarityProducts,
} from "@/features/catalog/queries";
import { siteJsonLd } from "@/features/catalog/structured-data";
import type { ProductSummary } from "@/features/catalog/types";
import type { AppHref } from "@/lib/routes";
import { baseOpenGraph } from "@/lib/seo";

const title = `${siteConfig.name} · Componentes de PC y computadores en Colombia`;
const description =
  "Tarjetas gráficas, procesadores, memorias RAM, almacenamiento y computadores armados con ficha técnica completa y disponibilidad al momento.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { ...baseOpenGraph, title, description, url: "/" },
};

async function HomeHero() {
  const [featured, prebuilt] = await Promise.all([
    getHomeCollection("featured", 8),
    getHomeCollection("prebuilt", 4),
  ]);
  // Prioriza un equipo armado destacado y disponible; si no hay, el primero disponible.
  const candidate =
    featured.find((product) => product.productType === "prebuilt" && product.stock > 0) ??
    prebuilt.find((product) => product.stock > 0) ??
    prebuilt[0];
  const product = candidate ? await getProductBySlug(candidate.slug) : null;
  return <Hero product={product} prebuiltHref={prebuiltCategoryHref(prebuilt)} />;
}

/** Categoría de los equipos armados según los datos (null si aún no hay ninguno). */
function prebuiltCategoryHref(prebuilt: ProductSummary[]): AppHref | null {
  const slug = prebuilt[0]?.category.slug;
  return slug ? `/categorias/${slug}` : null;
}

async function HomeCategories() {
  const categories = (await getCategories()).filter((category) => !category.parentId);
  return <CategoryGrid categories={categories.map(({ name, slug }) => ({ name, slug }))} />;
}

async function HomeCollections() {
  const [featured, deals, prebuilt, newest, bestSellers, rarities] = await Promise.all([
    getHomeCollection("featured", 8),
    getHomeCollection("deals", 4),
    getHomeCollection("prebuilt", 4),
    getHomeCollection("newest", 4),
    getBestSellers(4),
    getRarityProducts(true, 8),
  ]);

  // Filas completas en escritorio (4 columnas) para no dejar huecos.
  const featuredRows =
    featured.length >= 4 ? featured.slice(0, featured.length - (featured.length % 4)) : featured;

  return (
    <>
      <HomeSection
        id="destacados"
        title="Productos destacados"
        description="Selección de componentes y equipos recomendados."
        href="/productos"
        linkLabel="Ver catálogo"
        products={featuredRows}
      />
      <RarityShowcase products={rarities} />
      <HomeSection
        id="ofertas"
        title="Ofertas"
        description="Productos con precio rebajado frente a su precio anterior."
        href="/productos?oferta=1"
        linkLabel="Ver todas las ofertas"
        products={deals}
      />
      <HomeSection
        id="computadores"
        title="Computadores armados"
        description="Equipos configurados con componentes compatibles entre sí."
        href={prebuiltCategoryHref(prebuilt) ?? undefined}
        linkLabel="Ver computadores"
        products={prebuilt}
      />
      <HomeSection
        id="mas-vendidos"
        title="Más vendidos"
        description="Lo que más se ha pedido en los últimos 90 días."
        products={bestSellers}
      />
      <HomeSection
        id="nuevos"
        title="Recién agregados"
        href="/productos?orden=newest"
        linkLabel="Ver novedades"
        products={newest}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <main id="contenido" className="grid gap-16 pb-8 md:gap-20">
      <JsonLd data={siteJsonLd()} />
      <HomeHero />
      <AboutSection />
      <Benefits />
      <HomeCategories />
      <Suspense fallback={<ProductGridSkeleton className="container-page" />}>
        <HomeCollections />
      </Suspense>
    </main>
  );
}
