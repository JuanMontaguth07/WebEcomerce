import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { catalogHref, type CatalogFilters } from "@/features/catalog/params";
import { cn } from "@/lib/utils";

/** Páginas a mostrar: primera, última y vecinas de la actual, con saltos ("…"). */
export function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) result.push("gap");
    result.push(page);
  });
  return result;
}

export function Pagination({
  filters,
  basePath,
  pageCount,
}: {
  filters: CatalogFilters;
  basePath: string;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const current = Math.min(filters.page, pageCount);
  const href = (page: number) => catalogHref(basePath, filters, { page }) as Route;
  const itemClass =
    "inline-flex size-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors";

  return (
    <nav aria-label="Paginación" className="flex justify-center">
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {current > 1 ? (
            <Link
              href={href(current - 1)}
              className={cn(itemClass, "bg-card hover:border-input")}
              rel="prev"
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
              <span className="sr-only">Página anterior</span>
            </Link>
          ) : (
            <span className={cn(itemClass, "opacity-40")} aria-hidden>
              <ChevronLeftIcon className="size-4" />
            </span>
          )}
        </li>
        {pageWindow(current, pageCount).map((page, index) =>
          page === "gap" ? (
            <li key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden>
              …
            </li>
          ) : (
            <li key={page}>
              <Link
                href={href(page)}
                aria-current={page === current ? "page" : undefined}
                className={cn(
                  itemClass,
                  "tabular-nums",
                  page === current
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:border-input",
                )}
              >
                <span className="sr-only">Página </span>
                {page}
              </Link>
            </li>
          ),
        )}
        <li>
          {current < pageCount ? (
            <Link
              href={href(current + 1)}
              className={cn(itemClass, "bg-card hover:border-input")}
              rel="next"
            >
              <ChevronRightIcon className="size-4" aria-hidden />
              <span className="sr-only">Página siguiente</span>
            </Link>
          ) : (
            <span className={cn(itemClass, "opacity-40")} aria-hidden>
              <ChevronRightIcon className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
