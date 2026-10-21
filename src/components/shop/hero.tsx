import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ProductDetail } from "@/features/catalog/types";
import { formatCOP } from "@/lib/format";
import { CategoryIllustration } from "./category-illustration";

const READOUT_KEYS = ["cpu", "gpu", "ram", "storage", "psu"] as const;
const READOUT_LABEL: Record<(typeof READOUT_KEYS)[number], string> = {
  cpu: "CPU",
  gpu: "GPU",
  ram: "RAM",
  storage: "SSD",
  psu: "PSU",
};

function parseWatts(value: string | undefined): number | null {
  const match = value?.match(/(\d[\d.]*)\s*W/);
  return match?.[1] ? Number(match[1].replace(/\./g, "")) : null;
}

/** Hero tipo hoja técnica: presenta un equipo armado con sus componentes y consumo. */
export function Hero({ product }: { product: ProductDetail | null }) {
  const specs = new Map(product?.specs.map((spec) => [spec.key, spec.value]));
  const power = parseWatts(specs.get("estimated_power"));
  const psu = parseWatts(specs.get("psu"));
  const load = power && psu ? Math.min(100, Math.round((power / psu) * 100)) : null;

  return (
    <section className="relative overflow-hidden border-b bg-card">
      {/* Retícula técnica decorativa */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)] [background-size:48px_48px] opacity-[0.35]"
      />
      <div className="relative container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
        <div className="grid gap-6">
          <p className="text-eyebrow text-primary">Componentes · Computadores · Periféricos</p>
          <h1 className="text-4xl leading-[1.05] font-extrabold font-stretch-125% sm:text-5xl lg:text-6xl">
            Hardware para PC con ficha técnica completa
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Compara especificaciones reales, revisa la disponibilidad al momento y encuentra cada
            pieza por nombre, marca o SKU.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/productos">
                Explorar catálogo
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/categorias/computadores">Ver computadores</Link>
            </Button>
          </div>
        </div>

        {product && (
          <article
            aria-labelledby="hero-product"
            className="relative grid gap-5 rounded-2xl border bg-background/80 p-5 shadow-raised backdrop-blur sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1.5">
                <span className="text-eyebrow text-muted-foreground">Equipo destacado</span>
                <h2 id="hero-product" className="text-xl font-bold md:text-2xl">
                  <Link href={`/productos/${product.slug}`} className="hover:text-primary">
                    {product.name}
                  </Link>
                </h2>
              </div>
              <CategoryIllustration
                categorySlug={product.category.slug}
                className="w-20 shrink-0 text-primary sm:w-24"
              />
            </div>

            <dl className="grid border-t font-mono text-[0.8125rem]">
              {READOUT_KEYS.filter((key) => specs.has(key)).map((key) => (
                <div key={key} className="flex justify-between gap-4 border-b border-dashed py-2">
                  <dt className="text-muted-foreground">{READOUT_LABEL[key]}</dt>
                  <dd className="text-right">{specs.get(key)}</dd>
                </div>
              ))}
            </dl>

            {load !== null && (
              <div className="grid gap-2 font-mono text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Consumo estimado</span>
                  <span className="tabular-nums">
                    ~{power} W / {psu} W
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-secondary"
                  role="meter"
                  aria-label="Carga estimada de la fuente"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={load}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${load}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-heading text-2xl font-bold font-stretch-112% tabular-nums">
                {formatCOP(product.price)}
              </span>
              <Button asChild variant="outline">
                <Link href={`/productos/${product.slug}`}>Ver equipo</Link>
              </Button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
