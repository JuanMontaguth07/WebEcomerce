import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfiguratorEntry } from "@/components/architect/configurator-entry";
import { ConfiguratorSkeleton } from "@/components/architect/configurator-skeleton";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { siteConfig } from "@/config/site";
import { demoArchitectParts } from "@/features/architect/parts";
import { getArchitectParts } from "@/features/architect/queries";
import { getStoreSettings } from "@/features/store-settings/queries";
import { baseOpenGraph } from "@/lib/seo";

const title = "Arma tu PC";
const description =
  "Elige procesador, placa, gráfica y demás piezas: Kova Architect te dice al momento si encajan y por qué, con tu presupuesto a la vista.";

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

export default function ArchitectPage() {
  return (
    <main id="contenido" className="container-page grid gap-8 py-8 md:py-10">
      <header className="grid gap-3">
        <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: title }]} />
        <p className="text-eyebrow text-primary">Kova Architect</p>
        <h1 className="text-4xl leading-[1.05] font-extrabold font-stretch-125% md:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Elige cada pieza y te avisamos al momento si algo no encaja y por qué. Lo que no se pueda
          confirmar con la ficha técnica te lo decimos, sin suponer.
        </p>
      </header>
      <Suspense fallback={<ConfiguratorSkeleton />}>
        <ConfiguratorWithParts />
      </Suspense>
    </main>
  );
}
