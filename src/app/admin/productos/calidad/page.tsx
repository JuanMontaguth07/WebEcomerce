import { CheckCircle2Icon, PackageIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminPageHeader, FilterChips, param } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { QUALITY_CHECKS, type QualityCheck, type Severity } from "@/features/admin/quality";
import { getCatalogQuality } from "@/features/admin/quality-queries";
import { requireAdmin } from "@/features/auth/session";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calidad del catálogo" };

/** Cuántos productos se listan a la vez (lo peor primero). */
const SHOWN = 120;

const SEVERITY_CLASS: Record<Severity, string> = {
  high: "border-destructive/30 bg-destructive/10 text-destructive",
  medium: "border-warning/30 bg-warning/10 text-warning",
  low: "border-border bg-secondary text-secondary-foreground",
};

const isCheck = (value: string | undefined): value is QualityCheck =>
  Boolean(value && Object.hasOwn(QUALITY_CHECKS, value));

/** Aro con el puntaje: verde desde 80, ámbar desde 50, rojo por debajo. */
function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const length = 2 * Math.PI * radius;
  const tone = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  return (
    <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" aria-hidden>
      <circle cx="50" cy="50" r={radius} className="fill-none stroke-secondary" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        className={cn("fill-none stroke-current", tone)}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - score / 100)}
      />
    </svg>
  );
}

function scoreTone(score: number) {
  return score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
}

export default async function CatalogQualityPage({
  searchParams,
}: PageProps<"/admin/productos/calidad">) {
  await requireAdmin("/admin/productos/calidad");
  const params = await searchParams;
  const rawIssue = param(params.problema);
  const issue = isCheck(rawIssue) ? rawIssue : undefined;
  const quality = await getCatalogQuality();
  const total = quality.products.length;
  const matching = issue
    ? quality.products.filter((product) => product.issues.includes(issue))
    : quality.products.filter((product) => product.issues.length);
  const href = (check?: QualityCheck) =>
    (check ? `/admin/productos/calidad?problema=${check}` : "/admin/productos/calidad") as Route;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Calidad del catálogo"
        description="Lo que le falta a cada producto para verse bien en la tienda, en Google y en Arma tu PC."
        back={{ href: "/admin/productos", label: "Productos" }}
      />

      <section
        aria-label="Resumen"
        className="flex flex-wrap items-center gap-6 rounded-2xl border bg-card p-6"
      >
        <div className="relative grid place-items-center">
          <ScoreRing score={quality.average} />
          <span className="absolute font-heading text-3xl font-bold tabular-nums">
            {quality.average}
            <span className="sr-only"> de 100</span>
          </span>
        </div>
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="text-lg font-bold">
            {total
              ? quality.average >= 80
                ? "El catálogo se ve muy bien"
                : quality.average >= 50
                  ? "Vas por buen camino"
                  : "Al catálogo le falta información"
              : "Aún no hay productos"}
          </p>
          <p className="text-sm text-muted-foreground">
            {total
              ? `${quality.perfect} de ${total} ${total === 1 ? "producto está completo" : "productos están completos"}. Empieza por lo marcado en rojo: es lo que más afecta la venta.`
              : "Cuando cargues productos (a mano o importando un CSV) aquí verás qué les falta."}
          </p>
        </div>
      </section>

      {total > 0 && (
        <FilterChips
          label="Filtrar por pendiente"
          size="sm"
          items={[
            {
              key: "all",
              label: "Con pendientes",
              href: href(),
              active: !issue,
              count: total - quality.perfect,
            },
            ...(Object.keys(QUALITY_CHECKS) as QualityCheck[])
              .filter((check) => quality.counts[check] > 0)
              .map((check) => ({
                key: check,
                label: QUALITY_CHECKS[check].label,
                href: href(check),
                active: issue === check,
                count: quality.counts[check],
              })),
          ]}
        />
      )}

      {total > 0 &&
        (matching.length ? (
          <ul className="grid divide-y rounded-2xl border bg-card">
            {matching.slice(0, SHOWN).map((product) => (
              <li
                key={product.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4"
              >
                <span className="relative grid size-12 place-items-center overflow-hidden rounded-lg border bg-secondary text-muted-foreground">
                  {product.image ? (
                    <Image
                      src={storageImageUrl(product.image)}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain p-1"
                    />
                  ) : (
                    <PackageIcon className="size-5" aria-hidden />
                  )}
                </span>
                <div className="grid min-w-0 gap-1.5">
                  <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/admin/productos/${product.id}`}
                      className="truncate font-semibold hover:text-primary hover:underline"
                    >
                      {product.name}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
                    <Badge variant={product.isActive ? "success" : "outline"}>
                      {product.isActive ? "Visible" : "Oculto"}
                    </Badge>
                  </p>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Pendientes">
                    {product.issues.map((check) => {
                      const meta = QUALITY_CHECKS[check];
                      return (
                        <li key={check}>
                          <Link
                            href={
                              `/admin/productos/${product.id}${meta.anchor ? `#${meta.anchor}` : ""}` as Route
                            }
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
                              SEVERITY_CLASS[meta.severity],
                            )}
                          >
                            {meta.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <span
                  className={cn(
                    "font-heading text-xl font-bold tabular-nums",
                    scoreTone(product.score),
                  )}
                >
                  {product.score}
                  <span className="sr-only"> de 100</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-5 text-success" aria-hidden />
            {issue
              ? "Ningún producto tiene este pendiente."
              : "Todos los productos están completos."}
          </p>
        ))}
      {matching.length > SHOWN && (
        <p className="text-sm text-muted-foreground">
          Se muestran los {SHOWN} con más pendientes de {matching.length}. Al arreglarlos aparecen
          los siguientes.
        </p>
      )}
    </div>
  );
}
