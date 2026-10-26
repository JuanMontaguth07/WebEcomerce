import Link from "next/link";
import type { CategoryRef } from "@/features/catalog/types";
import { cn } from "@/lib/utils";
import { CategoryIllustration } from "./category-illustration";

export function CategoryGrid({
  categories,
  className = "container-page",
}: {
  categories: CategoryRef[];
  className?: string;
}) {
  if (!categories.length) return null;

  return (
    <section aria-labelledby="categorias" className={cn("grid gap-6", className)}>
      <h2 id="categorias" className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
        <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-primary" />
        Compra por categoría
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/categorias/${category.slug}`}
              className="group flex h-full flex-col items-start gap-3 rounded-xl border bg-card p-4 transition-[border-color,box-shadow,transform] duration-300 ease-out-soft hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary-soft/40 hover:shadow-glow"
            >
              <CategoryIllustration
                categorySlug={category.slug}
                className="w-16 text-muted-foreground transition-colors group-hover:text-primary"
              />
              <span className="text-sm font-semibold">{category.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
