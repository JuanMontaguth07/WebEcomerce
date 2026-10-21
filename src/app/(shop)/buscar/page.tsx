import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogResults, CatalogResultsSkeleton } from "@/components/catalog/catalog-results";
import { CategoryGrid } from "@/components/shop/category-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { parseCatalogParams } from "@/features/catalog/params";
import { getCategories } from "@/features/catalog/queries";

// Los resultados de búsqueda no se indexan (contenido variable y duplicado).
export const metadata: Metadata = {
  title: "Buscar productos",
  robots: { index: false, follow: true },
};

async function SearchContent({ searchParams }: PageProps<"/buscar">) {
  const filters = parseCatalogParams(await searchParams);
  const categories = (await getCategories())
    .filter((category) => !category.parentId)
    .map(({ name, slug }) => ({ name, slug }));

  if (!filters.q) {
    return (
      <>
        <div className="grid gap-2">
          <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">
            Buscar productos
          </h1>
          <p className="text-muted-foreground">
            Escribe en el buscador por nombre, marca o SKU, o explora por categoría.{" "}
            <Link href="/productos" className="font-semibold text-primary hover:underline">
              Ver todo el catálogo
            </Link>
          </p>
        </div>
        <CategoryGrid categories={categories} className="" />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-1">
        <p className="text-eyebrow text-muted-foreground">Resultados de búsqueda</p>
        <h1 className="text-3xl font-extrabold break-words font-stretch-125% md:text-4xl">
          «{filters.q}»
        </h1>
      </div>
      <Suspense fallback={<CatalogResultsSkeleton />}>
        <CatalogResults
          searchParams={searchParams}
          basePath="/buscar"
          categoryMode={{ type: "param", categories }}
        />
      </Suspense>
    </>
  );
}

export default function SearchPage(props: PageProps<"/buscar">) {
  return (
    <main id="contenido" className="container-page grid gap-6 py-8">
      <Suspense
        fallback={
          <div className="grid gap-6" aria-busy>
            <Skeleton className="h-10 w-64" />
            <CatalogResultsSkeleton />
          </div>
        }
      >
        <SearchContent {...props} />
      </Suspense>
    </main>
  );
}
