"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { createContext, useContext, useOptimistic, useTransition } from "react";
import { buildCatalogQuery, type CatalogFilters } from "@/features/catalog/params";
import { cn } from "@/lib/utils";

type CatalogNavigation = {
  filters: CatalogFilters;
  basePath: string;
  isPending: boolean;
  /** Aplica cambios de filtros; vuelve a la página 1 salvo que se indique otra. */
  update: (changes: Partial<CatalogFilters>) => void;
  hrefFor: (changes: Partial<CatalogFilters>) => Route;
};

const CatalogNavigationContext = createContext<CatalogNavigation | null>(null);

export function useCatalogNavigation() {
  const context = useContext(CatalogNavigationContext);
  if (!context) throw new Error("useCatalogNavigation requiere <CatalogNavigationProvider>.");
  return context;
}

export function CatalogNavigationProvider({
  filters,
  basePath,
  children,
}: {
  filters: CatalogFilters;
  basePath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Los controles reflejan el cambio al instante; si la navegación falla, vuelven a la URL.
  const [optimisticFilters, setOptimisticFilters] = useOptimistic(filters);

  const hrefFor = (changes: Partial<CatalogFilters>) =>
    `${basePath}${buildCatalogQuery(optimisticFilters, { page: 1, ...changes })}` as Route;

  const update = (changes: Partial<CatalogFilters>) => {
    const href = hrefFor(changes);
    startTransition(() => {
      setOptimisticFilters({ ...optimisticFilters, page: 1, ...changes });
      router.replace(href, { scroll: false });
    });
  };

  return (
    <CatalogNavigationContext.Provider
      value={{ filters: optimisticFilters, basePath, isPending, update, hrefFor }}
    >
      {children}
    </CatalogNavigationContext.Provider>
  );
}

/** Atenúa los resultados mientras se cargan los nuevos filtros. */
export function CatalogPendingRegion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isPending } = useCatalogNavigation();
  return (
    <div
      aria-busy={isPending}
      className={cn(
        "transition-opacity duration-200",
        isPending && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </div>
  );
}
