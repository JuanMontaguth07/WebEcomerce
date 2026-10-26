import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogResults, CatalogResultsSkeleton } from "@/components/catalog/catalog-results";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories, getCategoryBySlug } from "@/features/catalog/queries";
import { listingMetadata } from "@/features/catalog/seo";
import { slugParams } from "@/lib/static-params";

export async function generateStaticParams() {
  const categories = await getCategories();
  return slugParams(categories.map((category) => category.slug));
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Categoría no encontrada", robots: { index: false } };

  return listingMetadata(`/categorias/${slug}`, await searchParams, {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description ?? undefined,
  });
}

async function CategoryContent({ params, searchParams }: PageProps<"/categorias/[slug]">) {
  const { slug } = await params;
  const [category, categories] = await Promise.all([getCategoryBySlug(slug), getCategories()]);
  if (!category) notFound();

  const parent = categories.find((item) => item.id === category.parentId);
  const topLevel = categories.filter((item) => !item.parentId);

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Productos", href: "/productos" },
          ...(parent ? [{ name: parent.name, href: `/categorias/${parent.slug}` as const }] : []),
          { name: category.name },
        ]}
      />
      <div className="grid gap-2">
        <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">{category.name}</h1>
        {category.description && (
          <p className="max-w-2xl text-muted-foreground">{category.description}</p>
        )}
      </div>
      <Suspense fallback={<CatalogResultsSkeleton />}>
        <CatalogResults
          searchParams={searchParams}
          basePath={`/categorias/${slug}`}
          fixed={{ category: slug }}
          categoryMode={{
            type: "links",
            current: slug,
            categories: topLevel.map(({ name, slug: s }) => ({ name, slug: s })),
          }}
        />
      </Suspense>
    </>
  );
}

export default function CategoryPage(props: PageProps<"/categorias/[slug]">) {
  return (
    <main id="contenido" className="container-page grid gap-6 py-8">
      <Suspense
        fallback={
          <div className="grid gap-6" aria-busy>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-72" />
            <CatalogResultsSkeleton />
          </div>
        }
      >
        <CategoryContent {...props} />
      </Suspense>
    </main>
  );
}
