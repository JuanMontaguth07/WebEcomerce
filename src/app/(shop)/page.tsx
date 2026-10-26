import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutSection } from "@/components/shop/about-section";
import { Benefits } from "@/components/shop/benefits";
import { CategoryGrid } from "@/components/shop/category-grid";
import { Hero } from "@/components/shop/hero";
import { HomeBannerCard } from "@/components/shop/home-banner";
import { HomeSection } from "@/components/shop/home-section";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductGridSkeleton } from "@/components/shop/product-grid";
import { UniqueShowcase } from "@/components/shop/unique-showcase";
import { siteConfig } from "@/config/site";
import { getHomeBanners } from "@/features/banners/queries";
import type { HomeBanner } from "@/features/banners/types";
import {
  getBestSellers,
  getCategories,
  getHomeCollection,
  getProductBySlug,
  getUniqueProducts,
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
  const [featured, deals, prebuilt, newest, bestSellers, unique, banners] = await Promise.all([
    getHomeCollection("featured", 8),
    getHomeCollection("deals", 4),
    getHomeCollection("prebuilt", 4),
    getHomeCollection("newest", 4),
    getBestSellers(4),
    getUniqueProducts(4),
    getHomeBanners(),
  ]);

  // Filas completas en escritorio (4 columnas) para no dejar huecos.
  const featuredRows =
    featured.length >= 4 ? featured.slice(0, featured.length - (featured.length % 4)) : featured;

  // Solo las secciones con productos; entre ellas se intercalan los anuncios.
  const sections = [
    featuredRows.length > 0 && (
      <HomeSection
        key="destacados"
        id="destacados"
        title="Productos destacados"
        description="Selección de componentes y equipos recomendados."
        href="/productos"
        linkLabel="Ver catálogo"
        products={featuredRows}
      />
    ),
    unique.length > 0 && <UniqueShowcase key="unicas" items={unique} />,
    deals.length > 0 && (
      <HomeSection
        key="ofertas"
        id="ofertas"
        title="Ofertas"
        description="Productos con precio rebajado frente a su precio anterior."
        href="/productos?oferta=1"
        linkLabel="Ver todas las ofertas"
        products={deals}
      />
    ),
    prebuilt.length > 0 && (
      <HomeSection
        key="computadores"
        id="computadores"
        title="Computadores armados"
        description="Equipos configurados con componentes compatibles entre sí."
        href={prebuiltCategoryHref(prebuilt) ?? undefined}
        linkLabel="Ver computadores"
        products={prebuilt}
      />
    ),
    bestSellers.length > 0 && (
      <HomeSection
        key="mas-vendidos"
        id="mas-vendidos"
        title="Más vendidos"
        description="Lo que más se ha pedido en los últimos 90 días."
        products={bestSellers}
      />
    ),
    newest.length > 0 && (
      <HomeSection
        key="nuevos"
        id="nuevos"
        title="Recién agregados"
        href="/productos?orden=newest"
        linkLabel="Ver novedades"
        products={newest}
      />
    ),
  ].filter(Boolean);

  return <>{interleave(sections, banners)}</>;
}

/**
 * Un anuncio después de cada dos secciones (alternando el lado de la imagen);
 * los que sobren van al final. Sin productos, la portada muestra solo los anuncios.
 */
function interleave(sections: React.ReactNode[], banners: HomeBanner[]) {
  const banner = (item: HomeBanner, index: number) => (
    <aside key={item.id} aria-label={item.title} className="container-page">
      <HomeBannerCard banner={item} reverse={index % 2 === 1} />
    </aside>
  );
  const output: React.ReactNode[] = [];
  let next = 0;
  sections.forEach((section, index) => {
    output.push(section);
    if (index % 2 === 0 && next < banners.length) {
      output.push(banner(banners[next] as HomeBanner, next));
      next += 1;
    }
  });
  banners.slice(next).forEach((item, offset) => output.push(banner(item, next + offset)));
  return output;
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
