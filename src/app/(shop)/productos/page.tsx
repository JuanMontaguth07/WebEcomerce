import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogResults, CatalogResultsSkeleton } from "@/components/catalog/catalog-results";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { getCategories } from "@/features/catalog/queries";
import { listingMetadata } from "@/features/catalog/seo";

export async function generateMetadata({
  searchParams,
}: PageProps<"/productos">): Promise<Metadata> {
  return listingMetadata("/productos", await searchParams, {
    title: "Todos los productos",
    description:
      "Catálogo de componentes de PC, computadores armados y monitores. Filtra por marca, precio y disponibilidad.",
  });
}

export default async function ProductsPage({ searchParams }: PageProps<"/productos">) {
  const categories = (await getCategories()).filter((category) => !category.parentId);

  return (
    <main id="contenido" className="container-page grid gap-6 py-8">
      <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Productos" }]} />
      <div className="grid gap-2">
        <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">
          Todos los productos
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Componentes, computadores armados y monitores con su ficha técnica y disponibilidad.
        </p>
      </div>
      <Suspense fallback={<CatalogResultsSkeleton />}>
        <CatalogResults
          searchParams={searchParams}
          basePath="/productos"
          categoryMode={{
            type: "links",
            categories: categories.map(({ name, slug }) => ({ name, slug })),
          }}
        />
      </Suspense>
    </main>
  );
}
