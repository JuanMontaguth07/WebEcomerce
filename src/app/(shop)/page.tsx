import type { Metadata } from "next";
import { Suspense } from "react";
import { Benefits } from "@/components/shop/benefits";
import { CategoryGrid } from "@/components/shop/category-grid";
import { Hero } from "@/components/shop/hero";
import { HomeSection } from "@/components/shop/home-section";
import { ProductGridSkeleton } from "@/components/shop/product-grid";
import { siteConfig } from "@/config/site";
import {
  getBestSellers,
  getCategories,
  getHomeCollection,
  getProductBySlug,
} from "@/features/catalog/queries";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} · Componentes de PC y computadores en Colombia` },
  description:
    "Tarjetas gráficas, procesadores, memorias RAM, almacenamiento y computadores armados con ficha técnica completa y disponibilidad al momento.",
  alternates: { canonical: "/" },
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
  return <Hero product={product} />;
}

async function HomeCategories() {
  const categories = (await getCategories()).filter((category) => !category.parentId);
  return <CategoryGrid categories={categories.map(({ name, slug }) => ({ name, slug }))} />;
}

async function HomeCollections() {
  const [featured, deals, prebuilt, newest, bestSellers] = await Promise.all([
    getHomeCollection("featured", 8),
    getHomeCollection("deals", 4),
    getHomeCollection("prebuilt", 4),
    getHomeCollection("newest", 4),
    getBestSellers(4),
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
        href="/categorias/computadores"
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
      <HomeHero />
      <Benefits />
      <HomeCategories />
      <Suspense fallback={<ProductGridSkeleton className="container-page" />}>
        <HomeCollections />
      </Suspense>
    </main>
  );
}
