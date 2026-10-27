import { Skeleton } from "@/components/ui/skeleton";
import type { ProductSummary } from "@/features/catalog/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

const GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";

export function ProductGrid({
  products,
  priorityCount = 0,
  className,
}: {
  products: ProductSummary[];
  /** Cuántas tarjetas iniciales cargan su imagen con prioridad. */
  priorityCount?: number;
  className?: string;
}) {
  return (
    <ul className={cn(GRID, className)}>
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} priority={index < priorityCount} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn(GRID, className)} aria-busy aria-live="polite">
      <span className="sr-only">Cargando productos…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="grid gap-3 rounded-2xl border bg-card p-0">
          <Skeleton className="aspect-[4/3] w-full rounded-none rounded-t-xl" />
          <div className="grid gap-2 px-4 pb-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="mt-2 h-5 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
