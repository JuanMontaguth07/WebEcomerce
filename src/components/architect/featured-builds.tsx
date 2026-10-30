import { ArrowRightIcon, CpuIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { FeaturedBuild } from "@/features/architect/featured";
import { PART_LABELS, type PartKind } from "@/features/compatibility/types";
import { formatCOP } from "@/lib/format";

/** Las piezas que más dicen de un equipo, en este orden. */
const HIGHLIGHT: PartKind[] = ["cpu", "gpu", "ram", "storage"];

/**
 * PCs ya armadas que recomienda la tienda: se abren en el configurador para
 * cambiar lo que se quiera. El total va con los precios de hoy.
 */
export function FeaturedBuilds({ builds }: { builds: FeaturedBuild[] }) {
  if (!builds.length) return null;
  return (
    <section aria-labelledby="pcs-armadas" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="pcs-armadas" className="text-2xl font-extrabold font-stretch-112% md:text-3xl">
          PCs ya armadas
        </h2>
        <p className="text-muted-foreground">
          Equipos que recomendamos. Ábrelos y cambia lo que quieras: te decimos al momento si sigue
          encajando.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {builds.map((build) => {
          const highlighted = HIGHLIGHT.flatMap((kind) =>
            build.components.filter((part) => part.kind === kind).slice(0, 1),
          );
          const missing = build.components.some((part) => !part.available);
          return (
            <li
              key={build.id}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-5 transition-[translate,border-color,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <CpuIcon className="size-5" aria-hidden />
                </span>
                <span className="flex flex-wrap justify-end gap-1.5">
                  {build.tag && <Badge variant="soft">{build.tag}</Badge>}
                  {build.source === "demo" && <Badge variant="outline">Con piezas demo</Badge>}
                </span>
              </div>
              <div className="grid gap-1">
                <h3 className="text-lg leading-snug font-bold">
                  <Link
                    href={`/arma-tu-pc/${build.code}`}
                    className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
                  >
                    {build.title}
                  </Link>
                </h3>
                {build.description && (
                  <p className="text-sm text-muted-foreground">{build.description}</p>
                )}
              </div>
              {highlighted.length > 0 && (
                <dl className="grid gap-1.5 text-sm">
                  {highlighted.map((part) => (
                    <div key={part.kind} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
                      <dt className="text-xs text-muted-foreground">{PART_LABELS[part.kind]}</dt>
                      <dd className="truncate font-medium" title={part.name}>
                        {part.name}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="mt-auto grid gap-2 border-t pt-4">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {build.components.length} piezas
                  </span>
                  <span className="font-heading text-xl font-bold font-stretch-112% tabular-nums">
                    {formatCOP(build.total)}
                  </span>
                </p>
                {missing && (
                  <p className="text-xs text-warning">
                    Alguna pieza ya no está: al abrirla te mostramos qué cambiar.
                  </p>
                )}
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Abrir y personalizar
                  <ArrowRightIcon
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
