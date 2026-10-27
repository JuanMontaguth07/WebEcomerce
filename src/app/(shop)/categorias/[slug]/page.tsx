import { ArrowRightIcon, CpuIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
  const architect = category.architectPart ?? parent?.architectPart ?? null;

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">{category.name}</h1>
          {category.description && (
            <p className="max-w-2xl text-muted-foreground">{category.description}</p>
          )}
        </div>
        {architect && (
          <Link
            href={`/arma-tu-pc?tipo=${architect}`}
            className="group flex items-center gap-3 rounded-xl border border-primary/40 bg-primary-soft px-4 py-3 transition-colors hover:border-primary"
          >
            <CpuIcon className="size-5 text-primary" aria-hidden />
            <span className="grid">
              <span className="text-sm font-semibold">Arma tu PC con esta pieza</span>
              <span className="text-xs text-muted-foreground">
                Te decimos qué encaja con cada opción
              </span>
            </span>
            <ArrowRightIcon
              className="size-4 text-primary transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
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
