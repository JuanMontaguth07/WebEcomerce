import type { Route } from "next";
import {
  ArrowRightIcon,
  CircuitBoardIcon,
  CpuIcon,
  FanIcon,
  GpuIcon,
  HardDriveIcon,
  MemoryStickIcon,
  PcCaseIcon,
  PlugZapIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CountUp } from "@/components/admin/count-up";
import { Marquee } from "@/components/shop/marquee";
import type { CatalogSummary } from "@/features/architect/summary";
import { PART_KINDS, PART_LABELS, type PartKind } from "@/features/compatibility/types";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { Pc3d } from "./pc-3d";

/** Título de sección de la zona: «/pcs-armadas», con la barra en degradado. */
export function ZoneHeading({
  id,
  slug,
  description,
}: {
  id: string;
  slug: string;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h2
        id={id}
        className="font-heading text-3xl leading-none font-extrabold font-stretch-112% md:text-4xl"
      >
        <span className="zone-text">/</span>
        {slug}
      </h2>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground md:text-right">{description}</p>
      )}
    </div>
  );
}

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString("es-CO")} ${count === 1 ? one : many}`;

/**
 * Portada de Arma tu PC: titular, PC en 3D que sigue el cursor y, si hay
 * catálogo, cuántas piezas, tipos y sockets se pueden armar.
 */
export function ArchitectHero({
  summary,
  hasFeatured,
  breadcrumbs,
}: {
  summary: CatalogSummary;
  hasFeatured: boolean;
  breadcrumbs: React.ReactNode;
}) {
  const kinds = PART_KINDS.filter((kind) => summary.byKind[kind] > 0).length;

  return (
    <section aria-labelledby="architect-title" className="grid gap-8">
      <div className="relative grid items-center gap-6 lg:grid-cols-2">
        <div aria-hidden className="zone-grid pointer-events-none absolute -inset-x-8 -inset-y-4" />
        <div className="relative grid gap-5">
          {breadcrumbs}
          <p className="text-eyebrow text-primary">/arma-tu-pc · Kova Architect</p>
          <h1
            id="architect-title"
            className="text-5xl leading-[1.02] font-black font-stretch-125% md:text-6xl xl:text-7xl"
          >
            Arma tu PC. <span className="zone-text">Compara</span> dónde sale mejor.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Elige cada pieza y te decimos al momento si encaja y por qué. Te mostramos lo que
            tenemos aquí y lo que cuesta en otras tiendas, para que armes al mejor precio.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#configurador"
              className="zone-shine zone-gradient inline-flex h-12 items-center gap-2 rounded-xl px-6 font-semibold shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
            >
              Armar la mía
              <ArrowRightIcon className="size-4" aria-hidden />
            </a>
            {hasFeatured && (
              <a
                href="#pcs-armadas"
                className="inline-flex h-12 items-center rounded-xl border px-6 font-semibold transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/50"
              >
                Ver PCs armadas
              </a>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground">
            {["Socket, formato y medidas", "Consumo frente a la fuente", "Sin FPS inventados"].map(
              (item) => (
                <li key={item}>
                  <span className="text-primary">✓</span> {item}
                </li>
              ),
            )}
          </ul>
        </div>
        <Pc3d
          className="relative"
          chips={[
            {
              title: "Compatibilidad",
              text: "Socket, formato, medidas y consumo, al momento",
              className: "top-[6%] left-0",
              depth: 10,
            },
            {
              title: "Compara tiendas",
              text: "Aquí, MercadoLibre, Amazon y más",
              className: "top-[44%] right-0 hidden sm:grid",
              depth: -8,
            },
            {
              title: "Estadísticas",
              text: "Rendimiento, consumo y equilibrio del equipo",
              className: "bottom-[6%] right-[4%]",
              depth: 16,
            },
          ]}
        />
      </div>

      {summary.total > 0 && (
        <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card md:grid-cols-4">
          {[
            { value: summary.total, label: "piezas con ficha técnica", count: true },
            { value: kinds, label: "tipos de pieza", count: true },
            {
              value: summary.sockets.length,
              label: summary.sockets.length
                ? `sockets: ${summary.sockets.join(", ")}`
                : "sockets de procesador",
              count: true,
            },
            { value: "COP", label: "precios en pesos (dólares con la tasa del día)", count: false },
          ].map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "grid gap-0.5 px-5 py-4",
                index > 0 && "md:border-l",
                index % 2 === 1 && "border-l",
                index > 1 && "border-t md:border-t-0",
              )}
            >
              <dt className="order-2 text-xs text-muted-foreground">{item.label}</dt>
              <dd className="font-heading text-3xl font-extrabold font-stretch-112% tabular-nums">
                {typeof item.value === "number" ? (
                  <CountUp value={item.value} format="number" />
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export type ZoneBrand = { name: string; logoPath: string | null; count: number };

/** Las marcas de las piezas, en una franja que se desliza (logo si el admin lo subió). */
export function ArchitectBrands({ brands }: { brands: ZoneBrand[] }) {
  if (brands.length < 3) return null;
  return (
    <section aria-labelledby="architect-brands" className="grid gap-5">
      <ZoneHeading
        id="architect-brands"
        slug="marcas"
        description="Las marcas con las que puedes armar. Pasa el cursor para detener la franja."
      />
      <Marquee
        label="Marcas"
        seconds={Math.max(28, brands.length * 4)}
        items={brands.map((brand) => ({
          key: brand.name,
          node: (
            <div className="glow-follow grid h-20 w-44 place-items-center gap-1 rounded-2xl border bg-card px-4 transition-colors duration-300 hover:border-primary/50">
              {brand.logoPath ? (
                <span className="relative grid h-10 w-full place-items-center overflow-hidden rounded-lg bg-[#f1f4f6]">
                  <Image
                    src={storageImageUrl(brand.logoPath)}
                    alt={brand.name}
                    fill
                    sizes="10rem"
                    className="object-contain p-2"
                  />
                </span>
              ) : (
                <span className="font-heading text-lg leading-tight font-extrabold tracking-wide text-muted-foreground uppercase font-stretch-118%">
                  {brand.name}
                </span>
              )}
              <span className="font-mono text-[0.6875rem] text-muted-foreground">
                {plural(brand.count, "pieza", "piezas")}
              </span>
            </div>
          ),
        }))}
      />
    </section>
  );
}

const KIND_ICONS: Record<PartKind, LucideIcon> = {
  gpu: GpuIcon,
  cpu: CpuIcon,
  motherboard: CircuitBoardIcon,
  ram: MemoryStickIcon,
  storage: HardDriveIcon,
  psu: PlugZapIcon,
  cooler: FanIcon,
  case: PcCaseIcon,
};

/** Orden de las tarjetas: la gráfica primero (por donde casi todos empiezan). */
const KIND_ORDER: PartKind[] = [
  "gpu",
  "cpu",
  "motherboard",
  "ram",
  "storage",
  "psu",
  "cooler",
  "case",
];

/** Una tarjeta por tipo de pieza: abre el configurador en esa pieza. */
export function PartKindCards({ summary }: { summary: CatalogSummary }) {
  return (
    <section aria-labelledby="architect-kinds" className="grid gap-5">
      <ZoneHeading
        id="architect-kinds"
        slug="empieza-por-una-pieza"
        description="Toca una y entras al configurador con esa pieza abierta."
      />
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pt-1 pb-3 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {KIND_ORDER.map((kind, index) => {
          const Icon = KIND_ICONS[kind];
          const count = summary.byKind[kind];
          const first = index === 0;
          return (
            <li key={kind} className="w-40 shrink-0 snap-start lg:w-auto">
              <Link
                href={(count ? `/arma-tu-pc?tipo=${kind}#configurador` : "#configurador") as Route}
                className={cn(
                  "group grid h-full min-h-40 content-between gap-4 overflow-hidden rounded-2xl border p-4 transition-[transform,border-color] duration-300 ease-out-soft hover:-translate-y-1",
                  first
                    ? "zone-gradient border-transparent"
                    : "glow-follow bg-card hover:border-primary/50",
                )}
              >
                <Icon
                  className={cn(
                    "size-10 stroke-[1.5] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
                    first ? "" : "text-muted-foreground group-hover:text-primary",
                  )}
                  aria-hidden
                />
                <span className="grid gap-1">
                  <span className="font-heading leading-tight font-bold font-stretch-110%">
                    {PART_LABELS[kind]}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[0.6875rem]",
                      first ? "opacity-80" : "text-muted-foreground",
                    )}
                  >
                    {count ? plural(count, "opción", "opciones") : "Con piezas demo"}
                    {first && " · empieza aquí"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
