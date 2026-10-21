import { cn } from "@/lib/utils";

/** Marcador de carga. Es decorativo: el contenedor debe anunciar el estado (aria-busy). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-secondary", className)}
      {...props}
    />
  );
}

export { Skeleton };
