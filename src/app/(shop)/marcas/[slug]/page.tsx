import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogResults, CatalogResultsSkeleton } from "@/components/catalog/catalog-results";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrandBySlug, getBrands, getCategories } from "@/features/catalog/queries";
import { listingMetadata } from "@/features/catalog/seo";

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/marcas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Marca no encontrada", robots: { index: false } };

  return listingMetadata(`/marcas/${slug}`, await searchParams, {
    title: `Productos ${brand.name}`,
    description:
      brand.description ??
      `Productos ${brand.name} con ficha técnica completa y disponibilidad al momento.`,
  });
}

async function BrandContent({ params, searchParams }: PageProps<"/marcas/[slug]">) {
  const { slug } = await params;
  const [brand, categories] = await Promise.all([getBrandBySlug(slug), getCategories()]);
  if (!brand) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Productos", href: "/productos" },
          { name: brand.name },
        ]}
      />
      <div className="grid gap-2">
        <p className="text-eyebrow text-muted-foreground">Marca</p>
        <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">{brand.name}</h1>
        {brand.description && (
          <p className="max-w-2xl text-muted-foreground">{brand.description}</p>
        )}
      </div>
      <Suspense fallback={<CatalogResultsSkeleton />}>
        <CatalogResults
          searchParams={searchParams}
          basePath={`/marcas/${slug}`}
          scope={{ brand: slug }}
          categoryMode={{
            type: "param",
            categories: categories
              .filter((category) => !category.parentId)
              .map(({ name, slug: s }) => ({ name, slug: s })),
          }}
        />
      </Suspense>
    </>
  );
}

export default function BrandPage(props: PageProps<"/marcas/[slug]">) {
  return (
    <main id="contenido" className="container-page grid gap-6 py-8">
      <Suspense
        fallback={
          <div className="grid gap-6" aria-busy>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-56" />
            <CatalogResultsSkeleton />
          </div>
        }
      >
        <BrandContent {...props} />
      </Suspense>
    </main>
  );
}
