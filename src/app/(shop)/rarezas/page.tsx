import { GemIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { ProductGrid, ProductGridSkeleton } from "@/components/shop/product-grid";
import { RarityBadge } from "@/components/shop/rarity-badge";
import { RarityGlows } from "@/components/shop/rarity-showcase";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getRarityProducts } from "@/features/catalog/queries";
import { getRarities } from "@/features/rarities/queries";
import type { Rarity } from "@/features/rarities/types";
import { baseOpenGraph } from "@/lib/seo";

const title = "Rarezas";
const description =
  "Componentes y equipos difíciles de conseguir, ediciones especiales y piezas de colección.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/rarezas" },
  openGraph: {
    ...baseOpenGraph,
    title: `${title} · ${siteConfig.name}`,
    description,
    url: "/rarezas",
  },
};

async function RarityHeader() {
  const rarities = await getRarities().catch(() => []);
  return (
    <section className="relative isolate overflow-hidden border-b bg-card">
      <RarityGlows rarities={rarities} />
      <div className="container-page grid gap-5 py-12 md:py-16">
        <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: title }]} />
        <p className="text-eyebrow text-primary">Colección {siteConfig.name}</p>
        <h1 className="flex items-center gap-3 text-4xl leading-tight font-extrabold font-stretch-125% md:text-5xl">
          <GemIcon className="size-9 shrink-0 text-primary md:size-11" aria-hidden />
          {title}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{description}</p>
        {rarities.length > 0 && (
          <ul aria-label="Niveles, de la más rara a la menos rara" className="flex flex-wrap gap-2">
            {rarities.map((rarity) => (
              <li key={rarity.id}>
                <a href={`#${rarity.slug}`}>
                  <RarityBadge
                    rarity={rarity}
                    size="lg"
                    className="transition-transform hover:-translate-y-0.5"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

async function RarityTiers() {
  const products = await getRarityProducts(false);
  // Los productos llegan ordenados de la rareza más alta a la más baja.
  const tiers = new Map<string, { rarity: Rarity; items: typeof products }>();
  for (const product of products) {
    if (!product.rarity) continue;
    const tier = tiers.get(product.rarity.id) ?? { rarity: product.rarity, items: [] };
    tier.items.push(product);
    tiers.set(product.rarity.id, tier);
  }

  if (!tiers.size) {
    return (
      <div className="container-page">
        <div className="grid justify-items-center gap-4 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <GemIcon className="size-10 text-muted-foreground" aria-hidden />
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold">Pronto habrá rarezas aquí</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Estamos buscando piezas especiales. Mientras tanto, mira el catálogo completo.
            </p>
          </div>
          <Button asChild>
            <Link href="/productos">Ver catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page grid gap-14">
      {[...tiers.values()].map(({ rarity, items }) => {
        return (
          <section
            key={rarity.id}
            id={rarity.slug}
            aria-labelledby={`${rarity.slug}-titulo`}
            className="grid scroll-mt-28 gap-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 id={`${rarity.slug}-titulo`} className="text-2xl font-bold md:text-3xl">
                {rarity.name}
              </h2>
              <RarityBadge rarity={rarity} />
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "producto" : "productos"}
              </span>
            </div>
            {rarity.description && (
              <p className="-mt-3 text-muted-foreground">{rarity.description}</p>
            )}
            <ProductGrid products={items} />
          </section>
        );
      })}
    </div>
  );
}

export default function RaritiesPage() {
  return (
    <main id="contenido" className="grid gap-12 pb-12">
      <Suspense fallback={<div className="h-64 border-b bg-card" />}>
        <RarityHeader />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton className="container-page" />}>
        <RarityTiers />
      </Suspense>
    </main>
  );
}
