import {
  CpuIcon,
  FileTextIcon,
  PackageCheckIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react";
import { Marquee } from "./marquee";

// Capacidades reales de la tienda (no promesas comerciales sin confirmar).
const BENEFITS = [
  { Icon: FileTextIcon, title: "Ficha técnica completa", text: "en cada producto" },
  { Icon: PackageCheckIcon, title: "Disponibilidad al momento", text: "no vendemos lo que no hay" },
  { Icon: CpuIcon, title: "Arma tu PC", text: "te avisamos si algo no encaja" },
  { Icon: ScanSearchIcon, title: "Búsqueda por SKU", text: "la referencia exacta" },
  { Icon: ShieldCheckIcon, title: "Garantía a la vista", text: "antes de que decidas" },
  { Icon: TruckIcon, title: "Envíos en Colombia", text: "costo calculado en el checkout" },
] as const;

/** Lo que ofrece la tienda, como una cinta que se desliza bajo el hero. */
export function Benefits() {
  return (
    <section aria-labelledby="beneficios" className="border-y bg-card/60 py-4">
      <h2 id="beneficios" className="sr-only">
        Por qué comprar aquí
      </h2>
      <Marquee
        label="Por qué comprar aquí"
        seconds={50}
        items={BENEFITS.map(({ Icon, title, text }) => ({
          key: title,
          node: (
            <span className="flex items-center gap-3 px-6 text-sm whitespace-nowrap">
              <Icon className="size-4 text-primary" aria-hidden />
              <span className="font-semibold">{title}</span>
              <span className="text-muted-foreground">{text}</span>
              <span aria-hidden className="ml-3 size-1 rounded-full bg-primary/60" />
            </span>
          ),
        }))}
      />
    </section>
  );
}
