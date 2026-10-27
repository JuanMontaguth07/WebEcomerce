import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { bentoLayout, sortByProductCount, type BentoSize } from "@/features/catalog/bento";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { CategoryIllustration } from "./category-illustration";

export type BentoCategory = {
  name: string;
  slug: string;
  imagePath: string | null;
  /** Productos visibles, sumando subcategorías. */
  count: number;
  children: string[];
};

const SIZE_CLASS: Record<BentoSize, string> = {
  feature: "col-span-2 row-span-2",
  wide: "col-span-2",
  cell: "col-span-1",
};
const CLOSING_BASE = { 1: "col-span-1", 2: "col-span-2" } as const;
const CLOSING_MD = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
} as const;

const products = (count: number) => `${count} ${count === 1 ? "producto" : "productos"}`;

/**
 * Categorías principales en bento: las que tienen más productos ocupan más.
 * Cada celda usa la foto subida en el panel o, sin ella, la ilustración.
 */
export function CategoryBento({ categories }: { categories: BentoCategory[] }) {
  if (!categories.length) return null;

  const sorted = sortByProductCount(categories);
  const { sizes, closing } = bentoLayout(sorted.length);
  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <section aria-labelledby="categorias" className="reveal container-page grid gap-6">
      <h2 id="categorias" className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
        <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-primary" />
        Compra por categoría
      </h2>
      <ul className="grid grid-flow-row-dense auto-rows-[8.5rem] grid-cols-2 gap-3 md:auto-rows-[10rem] md:grid-cols-4">
        {sorted.map((category, index) => (
          <BentoTile key={category.slug} category={category} size={sizes[index] ?? "cell"} />
        ))}
        <li className={cn(CLOSING_BASE[closing.base], CLOSING_MD[closing.md])}>
          <Link
            href="/productos"
            className="group flex h-full flex-col justify-between gap-2 rounded-2xl border border-primary/40 bg-primary-soft p-4 transition-[border-color,box-shadow] duration-300 ease-out-soft hover:border-primary hover:shadow-glow md:p-5"
          >
            <span className="text-eyebrow text-primary">Catálogo</span>
            <span className="flex items-end justify-between gap-3">
              <span className="grid gap-1">
                <span className="font-heading text-lg leading-tight font-bold font-stretch-112%">
                  Ver todo
                </span>
                {total > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">{products(total)}</span>
                )}
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 ease-out-soft group-hover:translate-x-0.5">
                <ArrowRightIcon className="size-4" aria-hidden />
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

function BentoTile({ category, size }: { category: BentoCategory; size: BentoSize }) {
  const feature = size === "feature";
  const photo = category.imagePath;

  return (
    <li className={SIZE_CLASS[size]}>
      <Link
        href={`/categorias/${category.slug}`}
        className={cn(
          "group relative isolate flex h-full flex-col justify-end gap-1 overflow-hidden rounded-2xl border bg-card p-4 transition-[border-color,box-shadow] duration-300 ease-out-soft hover:border-primary/50 hover:shadow-[inset_0_0_36px_-14px_var(--primary)] md:p-5",
          // Luz ambiental: lima en la destacada y azul en la ancha, siempre tenue.
          feature &&
            "bg-[radial-gradient(80%_70%_at_85%_15%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]",
          size === "wide" &&
            "bg-[radial-gradient(70%_90%_at_90%_40%,color-mix(in_oklab,var(--tech)_12%,transparent),transparent)]",
        )}
      >
        {photo ? (
          <>
            <Image
              src={storageImageUrl(photo)}
              alt=""
              fill
              sizes={feature ? "(min-width: 48rem) 40rem, 100vw" : "(min-width: 48rem) 20rem, 50vw"}
              className="-z-20 object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
            />
            <span
              aria-hidden
              className="absolute inset-0 -z-10 bg-linear-to-t from-card via-card/75 to-card/10"
            />
          </>
        ) : (
          <CategoryIllustration
            categorySlug={category.slug}
            className={cn(
              "absolute -z-10 text-muted-foreground/70 transition-[color,translate] duration-500 ease-out-soft group-hover:text-primary",
              feature
                ? "top-6 right-4 w-[58%] max-w-72 group-hover:-translate-y-1 md:top-8 md:right-6"
                : size === "wide"
                  ? "top-1/2 right-4 w-[38%] max-w-44 -translate-y-1/2 group-hover:-translate-y-[56%]"
                  : "top-3 right-3 w-[40%] max-w-32 group-hover:-translate-y-1 md:w-[52%]",
            )}
          />
        )}

        <span
          className={cn(
            "font-heading leading-tight font-bold font-stretch-112%",
            feature ? "text-2xl md:text-3xl" : "text-base md:text-lg",
            size === "wide" && "max-w-[60%]",
          )}
        >
          {category.name}
        </span>
        {category.count > 0 && (
          <span className="font-mono text-xs text-muted-foreground">
            {products(category.count)}
          </span>
        )}
        {feature && category.children.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {category.children.slice(0, 4).map((child) => (
              <span
                key={child}
                className="rounded-md border bg-background/70 px-2 py-1 text-xs text-muted-foreground backdrop-blur"
              >
                {child}
              </span>
            ))}
          </span>
        )}
      </Link>
    </li>
  );
}
