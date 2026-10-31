import {
  ArrowRightIcon,
  CpuIcon,
  FanIcon,
  GpuIcon,
  HardDriveIcon,
  MemoryStickIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { FeaturedBuild } from "@/features/architect/featured";
import { PART_LABELS, type PartKind } from "@/features/compatibility/types";
import { formatCOP } from "@/lib/format";
import { ZoneHeading } from "./architect-landing";

/** Las piezas que más dicen de un equipo, en este orden (como chips). */
const HIGHLIGHT: { kind: PartKind; icon: LucideIcon; label: string }[] = [
  { kind: "gpu", icon: GpuIcon, label: "Gráfica" },
  { kind: "cpu", icon: CpuIcon, label: "Procesador" },
  { kind: "ram", icon: MemoryStickIcon, label: "Memoria" },
  { kind: "cooler", icon: FanIcon, label: "Refrigeración" },
  { kind: "storage", icon: HardDriveIcon, label: "Almacenamiento" },
];

/**
 * PCs ya armadas que recomienda la tienda, como tabla: nombre y para qué es,
 * sus piezas principales en chips y el total con los precios de hoy. Cada fila
 * abre el equipo en el configurador para cambiar lo que se quiera.
 */
export function FeaturedBuilds({ builds }: { builds: FeaturedBuild[] }) {
  if (!builds.length) return null;
  return (
    <section
      id="pcs-armadas"
      aria-labelledby="pcs-armadas-titulo"
      className="grid scroll-mt-24 gap-5"
    >
      <ZoneHeading
        id="pcs-armadas-titulo"
        slug="pcs-armadas"
        description="Equipos listos para jugar o trabajar. Ábrelos y cambia lo que quieras: te decimos al momento si sigue encajando."
      />
      <div className="border-t">
        <div
          aria-hidden
          className="hidden grid-cols-[minmax(10rem,1.1fr)_minmax(0,3fr)_12rem_2.5rem] gap-4 border-b px-2 py-3 text-xs text-muted-foreground md:grid"
        >
          <span>Equipo</span>
          <span>Piezas principales</span>
          <span className="text-right">Precio de hoy</span>
          <span />
        </div>
        <ul>
          {builds.map((build) => {
            const chips = HIGHLIGHT.flatMap((item) => {
              const part = build.components.find((component) => component.kind === item.kind);
              return part ? [{ ...item, name: part.name }] : [];
            }).slice(0, 4);
            const missing = build.components.some((part) => !part.available);
            return (
              <li
                key={build.id}
                className="glow-follow group relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border-b px-2 py-5 md:grid-cols-[minmax(10rem,1.1fr)_minmax(0,3fr)_12rem_2.5rem] md:items-center"
              >
                <div className="grid content-start gap-1.5">
                  <h3 className="text-lg leading-snug font-bold">
                    <Link
                      href={`/arma-tu-pc/${build.code}`}
                      className="outline-none after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:underline"
                    >
                      {build.title}
                    </Link>
                  </h3>
                  <span className="flex flex-wrap gap-1.5">
                    {build.tag && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[0.6875rem] text-primary">
                        {build.tag}
                      </span>
                    )}
                    {build.source === "demo" && (
                      <span className="rounded-full border px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                        Con piezas demo
                      </span>
                    )}
                  </span>
                </div>
                <ul
                  aria-label="Piezas principales"
                  className="col-span-2 flex flex-wrap gap-2 md:col-span-1"
                >
                  {chips.map((chip, index) => (
                    <li
                      key={chip.kind}
                      title={`${PART_LABELS[chip.kind]}: ${chip.name}`}
                      style={{ transitionDelay: `${index * 40}ms` }}
                      className="flex max-w-full min-w-0 items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1.5 transition-[translate,border-color] duration-300 ease-out-soft group-hover:-translate-y-0.5 group-hover:border-primary/40"
                    >
                      <chip.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="grid min-w-0">
                        <span className="text-[0.625rem] leading-tight text-muted-foreground">
                          {chip.label}
                        </span>
                        <span className="truncate text-xs leading-tight font-semibold">
                          {chip.name}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="col-span-2 grid gap-0.5 md:col-span-1 md:text-right">
                  <span className="font-heading text-xl font-extrabold font-stretch-110% tabular-nums">
                    {build.total > 0 && build.unpriced > 0 && (
                      <span className="mr-1 font-sans text-xs font-normal text-muted-foreground">
                        Desde
                      </span>
                    )}
                    {build.total > 0 ? formatCOP(build.total) : "Ver precios"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {missing
                      ? "Alguna pieza ya no está: te mostramos qué cambiar"
                      : build.unpriced > 0
                        ? `${build.unpriced} ${build.unpriced === 1 ? "pieza" : "piezas"} sin precio: compáralas al abrir`
                        : `${build.components.length} piezas`}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="col-start-2 row-start-1 grid size-9 place-items-center rounded-xl border text-primary transition-[translate,background-color,color] duration-300 ease-out-soft group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground md:col-start-auto md:row-start-auto"
                >
                  <ArrowRightIcon className="size-4" />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
