import { Skeleton } from "@/components/ui/skeleton";

/** Marcador de Arma tu PC mientras llegan las piezas. */
export function ConfiguratorSkeleton() {
  return (
    <div
      className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_21rem]"
      aria-busy
    >
      <span className="sr-only">Cargando piezas…</span>
      <div className="hidden gap-2 lg:grid lg:content-start">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
      <div className="grid content-start gap-2.5">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="hidden h-96 rounded-2xl xl:block" />
    </div>
  );
}
