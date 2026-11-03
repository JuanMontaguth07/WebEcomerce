import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ArchitectBrands,
  ArchitectHero,
  PartKindCards,
} from "@/components/architect/architect-landing";
import { ConfiguratorEntry } from "@/components/architect/configurator-entry";
import { ConfiguratorSkeleton } from "@/components/architect/configurator-skeleton";
import { FeaturedBuilds } from "@/components/architect/featured-builds";
import { PcOfTheWeek } from "@/components/architect/pc-of-the-week";
import { PointerGlow } from "@/components/architect/pointer-glow";
import { StoreReviews } from "@/components/architect/store-reviews";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { siteConfig } from "@/config/site";
import { spotlightOf } from "@/features/architect/featured";
import { getFeaturedBuilds } from "@/features/architect/featured-queries";
import { demoArchitectParts } from "@/features/architect/parts";
import { getArchitectParts } from "@/features/architect/queries";
import { catalogSummary } from "@/features/architect/summary";
import { getBrands } from "@/features/catalog/queries";
import { getStoreReviews } from "@/features/reviews/queries";
import { getStoreSettings } from "@/features/store-settings/queries";
import { baseOpenGraph } from "@/lib/seo";

const title = "Arma tu PC";
const description =
  "Elige procesador, placa, gráfica y demás piezas: Kova Architect te dice al momento si encajan y por qué, y compara precios aquí y en otras tiendas.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/arma-tu-pc" },
  openGraph: {
    ...baseOpenGraph,
    title: `${title} · ${siteConfig.name}`,
    description,
    url: "/arma-tu-pc",
  },
};

const breadcrumbs = <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: title }]} />;

/** Portada, marcas y tipos de pieza: salen del catálogo de Arma tu PC. */
async function Landing() {
  const [parts, featured, brands, reviews] = await Promise.all([
    getArchitectParts(),
    getFeaturedBuilds(),
    getBrands(),
    getStoreReviews(20),
  ]);
  const summary = catalogSummary(parts);
  const spotlight = spotlightOf(featured);
  const logos = new Map(brands.map((brand) => [brand.name.toLowerCase(), brand.logoPath]));
  return (
    <>
      <ArchitectHero
        summary={summary}
        hasFeatured={featured.length > 0}
        breadcrumbs={breadcrumbs}
      />
      <ArchitectBrands
        brands={summary.brands
          .slice(0, 16)
          .map((brand) => ({ ...brand, logoPath: logos.get(brand.name.toLowerCase()) ?? null }))}
      />
      <PartKindCards summary={summary} />
      {spotlight && <PcOfTheWeek build={spotlight} />}
      <FeaturedBuilds builds={featured} />
      <StoreReviews summary={reviews} />
    </>
  );
}

async function ConfiguratorWithParts() {
  const [catalogParts, settings] = await Promise.all([getArchitectParts(), getStoreSettings()]);
  return (
    <ConfiguratorEntry
      catalogParts={catalogParts}
      demoParts={demoArchitectParts()}
      whatsappNumber={settings.whatsappNumber}
      usdRate={settings.usdCopRate}
    />
  );
}

function LandingFallback() {
  return (
    <section aria-labelledby="architect-title" className="grid gap-4 py-6">
      {breadcrumbs}
      <h1 id="architect-title" className="text-5xl font-black font-stretch-125% md:text-6xl">
        Arma tu PC
      </h1>
    </section>
  );
}

export default function ArchitectPage() {
  return (
    <main id="contenido" className="architect-zone container-page grid gap-16 py-8 md:py-10">
      <PointerGlow />
      <Suspense fallback={<LandingFallback />}>
        <Landing />
      </Suspense>
      <section id="configurador" aria-label="Configurador" className="grid scroll-mt-24 gap-5">
        <Suspense fallback={<ConfiguratorSkeleton />}>
          <ConfiguratorWithParts />
        </Suspense>
      </section>
    </main>
  );
}
