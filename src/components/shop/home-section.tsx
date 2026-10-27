import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ProductSummary } from "@/features/catalog/types";
import { toRoute, type AppHref } from "@/lib/routes";
import { ProductGrid } from "./product-grid";

type HomeSectionProps = {
  id: string;
  title: string;
  description?: string;
  href?: AppHref;
  linkLabel?: string;
  products: ProductSummary[];
};

/** Bloque de la home con título, enlace "ver todo" y grilla. No se muestra si está vacío. */
export function HomeSection({
  id,
  title,
  description,
  href,
  linkLabel,
  products,
}: HomeSectionProps) {
  if (!products.length) return null;

  return (
    <section aria-labelledby={id} className="reveal container-page grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 id={id} className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
            <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-primary" />
            {title}
          </h2>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {href && (
          <Link
            href={toRoute(href)}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            {linkLabel ?? "Ver todo"}
            <ArrowRightIcon
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        )}
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
