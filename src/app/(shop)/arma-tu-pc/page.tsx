import type { Metadata } from "next";
import { Suspense } from "react";
import { Configurator } from "@/components/architect/configurator";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/config/site";
import { demoArchitectParts } from "@/features/architect/parts";
import { getArchitectParts } from "@/features/architect/queries";
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
  const catalogParts = await getArchitectParts();
  return <Configurator catalogParts={catalogParts} demoParts={demoArchitectParts()} />;
}

function ConfiguratorSkeleton() {
  return (
    <div
      className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_21rem]"
      aria-busy
    >
      <span className="sr-only">Cargando piezas…</span>
      <div className="hidden gap-2 lg:grid lg:content-start">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
      <div className="grid content-start gap-2.5">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="hidden h-96 rounded-2xl xl:block" />
    </div>
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
