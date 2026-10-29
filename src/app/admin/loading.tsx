import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mientras llega una sección del panel. Con este archivo la navegación es
 * inmediata: el menú y el encabezado se quedan y este esqueleto se precarga.
 */
export default function AdminLoading() {
  return (
    <div className="grid gap-6" aria-busy>
      <span className="sr-only" role="status">
        Cargando…
      </span>
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-11 rounded-[0.85rem] max-sm:hidden" />
        <div className="grid gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
