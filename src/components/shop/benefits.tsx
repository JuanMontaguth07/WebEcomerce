import { FileTextIcon, PackageCheckIcon, ScanSearchIcon, ShieldCheckIcon } from "lucide-react";

// Capacidades reales de la tienda (no promesas comerciales sin confirmar).
const BENEFITS = [
  {
    Icon: FileTextIcon,
    title: "Ficha técnica completa",
    text: "Especificaciones detalladas y comparables en cada producto.",
  },
  {
    Icon: PackageCheckIcon,
    title: "Disponibilidad al momento",
    text: "El inventario se actualiza con cada pedido; no vendemos lo que no hay.",
  },
  {
    Icon: ScanSearchIcon,
    title: "Búsqueda por SKU",
    text: "Encuentra la referencia exacta por nombre, marca o código.",
  },
  {
    Icon: ShieldCheckIcon,
    title: "Garantía a la vista",
    text: "Cada producto indica su garantía antes de que decidas.",
  },
] as const;

export function Benefits() {
  return (
    <section aria-labelledby="beneficios" className="reveal container-page">
      <h2 id="beneficios" className="sr-only">
        Por qué comprar aquí
      </h2>
      <ul className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-4 bg-card p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="grid gap-1">
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
