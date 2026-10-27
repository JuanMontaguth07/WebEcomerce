import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutSection } from "@/components/shop/about-section";
import { BrandStrip } from "@/components/shop/brand-strip";
import { Benefits } from "@/components/shop/benefits";
import { CategoryBento } from "@/components/shop/category-bento";
import { Hero } from "@/components/shop/hero";
import { HomeBannerCard } from "@/components/shop/home-banner";
import {
  BestSellersSection,
  DealsSection,
  FeaturedSection,
  NewArrivalsSection,
  PrebuiltSection,
} from "@/components/shop/home-collections";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductGridSkeleton } from "@/components/shop/product-grid";
import { UniqueShowcase } from "@/components/shop/unique-showcase";
import { siteConfig } from "@/config/site";
import { getHomeBanners } from "@/features/banners/queries";
import type { HomeBanner } from "@/features/banners/types";
import {
  getBestSellers,
  getBrands,
  getCatalogFacets,
  getCategories,
  getCategoryProductCounts,
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
  const [featured, prebuilt, deals, categories, counts] = await Promise.all([
    getHomeCollection("featured", 8),
    getHomeCollection("prebuilt", 4),
    getHomeCollection("deals", 4),
    getCategories(),
    getCategoryProductCounts(),
  ]);
  // Prioriza un equipo armado destacado y disponible; si no hay, el primero disponible.
  const candidate =
    featured.find((product) => product.productType === "prebuilt" && product.stock > 0) ??
    prebuilt.find((product) => product.stock > 0) ??
    prebuilt[0];
  const product = candidate ? await getProductBySlug(candidate.slug) : null;
  const stats = {
    products: Object.values(counts).reduce((sum, count) => sum + count, 0),
    categories: categories.filter((category) => !category.parentId).length,
  };
  return (
    <Hero
      product={product}
      prebuiltHref={prebuiltCategoryHref(prebuilt)}
      hasDeals={deals.length > 0}
      stats={stats}
    />
  );
}

/** Categoría de los equipos armados según los datos (null si aún no hay ninguno). */
function prebuiltCategoryHref(prebuilt: ProductSummary[]): AppHref | null {
  const slug = prebuilt[0]?.category.slug;
  return slug ? `/categorias/${slug}` : null;
}

async function HomeCategories() {
  const [categories, counts] = await Promise.all([getCategories(), getCategoryProductCounts()]);
  return (
    <CategoryBento
      categories={categories
        .filter((category) => !category.parentId)
        .map((parent) => ({
          name: parent.name,
          slug: parent.slug,
          imagePath: parent.imagePath,
          count: counts[parent.id] ?? 0,
          children: categories
            .filter((child) => child.parentId === parent.id)
            .map((child) => child.name),
        }))}
    />
  );
}

/** Marcas con productos publicados, las de más productos primero (máximo 12). */
async function HomeBrands() {
  const [brands, facets] = await Promise.all([
    getBrands(),
    getCatalogFacets({ q: null, category: null, inStock: false, onSale: false, specs: {} }),
  ]);
  const counts = new Map(facets.brands.map((brand) => [brand.slug, brand.count]));
  const strip = brands
    .map((brand) => ({ ...brand, count: counts.get(brand.slug) ?? 0 }))
    .filter((brand) => brand.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  return <BrandStrip brands={strip} />;
}

async function HomeCollections() {
  const [featured, deals, prebuilt, newest, bestSellers, unique, banners] = await Promise.all([
    getHomeCollection("featured", 12),
    getHomeCollection("deals", 8),
    getHomeCollection("prebuilt", 4),
    getHomeCollection("newest", 8),
    getBestSellers(4),
    getUniqueProducts(4),
    getHomeBanners(),
  ]);

  // Cada colección con su propia forma; se numeran en el orden en que aparecen.
  const builders: [boolean, (index: number) => React.ReactNode][] = [
    [
      featured.length > 0,
      (index) => <FeaturedSection key="destacados" index={index} products={featured} />,
    ],
    [unique.length > 0, (index) => <UniqueShowcase key="unicas" index={index} items={unique} />],
    [deals.length > 0, (index) => <DealsSection key="ofertas" index={index} products={deals} />],
    [
      prebuilt.length > 0,
      (index) => (
        <PrebuiltSection
          key="computadores"
          index={index}
          products={prebuilt}
          href={prebuiltCategoryHref(prebuilt) ?? undefined}
        />
      ),
    ],
    [
      bestSellers.length > 0,
      (index) => <BestSellersSection key="mas-vendidos" index={index} products={bestSellers} />,
    ],
    [
      newest.length > 0,
      (index) => <NewArrivalsSection key="nuevos" index={index} products={newest} />,
    ],
  ];
  const sections = builders
    .filter(([visible]) => visible)
    .map(([, build], position) => build(position + 1));

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
    <main id="contenido" className="grid grid-cols-[minmax(0,1fr)] gap-16 pb-8 md:gap-20">
      <JsonLd data={siteJsonLd()} />
      {/* La cinta de beneficios va pegada al hero. */}
      <div>
        <HomeHero />
        <Benefits />
      </div>
      <AboutSection />
      <HomeCategories />
      <HomeBrands />
      <Suspense fallback={<ProductGridSkeleton className="container-page" />}>
        <HomeCollections />
      </Suspense>
    </main>
  );
}
