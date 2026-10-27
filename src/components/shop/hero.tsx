import {
  ArrowRightIcon,
  CpuIcon,
  GpuIcon,
  HardDriveIcon,
  MemoryStickIcon,
  ZapIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ProductDetail } from "@/features/catalog/types";
import { formatCOP } from "@/lib/format";
import { toRoute, type AppHref } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CategoryIllustration } from "./category-illustration";
import { PointerParallax } from "./pointer-parallax";
import { ProductImage } from "./product-image";

type Floating = {
  key: string;
  label: string;
  value: string;
  Icon: LucideIcon;
  /** Carga de la fuente en %, solo para el consumo. */
  load?: number;
};

const SPEC_CARDS = [
  { key: "gpu", label: "GPU", Icon: GpuIcon },
  { key: "cpu", label: "CPU", Icon: CpuIcon },
  { key: "ram", label: "RAM", Icon: MemoryStickIcon },
  { key: "storage", label: "Almacenamiento", Icon: HardDriveIcon },
] as const;

/** Posición de cada tarjeta flotante en escritorio y su profundidad de paralaje. */
const PLACEMENT = [
  { className: "lg:-top-3 lg:-left-2 xl:-left-8", depth: 22 },
  { className: "lg:top-[40%] lg:-right-3 xl:-right-8", depth: 30 },
  { className: "lg:top-[50%] lg:-left-2 xl:-left-10", depth: 16 },
];

function parseWatts(value: string | undefined): number | null {
  const match = value?.match(/(\d[\d.]*)\s*W/);
  return match?.[1] ? Number(match[1].replace(/\./g, "")) : null;
}

const depth = (value: number) => ({ "--depth": value }) as React.CSSProperties;

/** GPU, CPU y consumo del equipo; si falta alguno, se completa con RAM o almacenamiento. */
function floatingSpecs(product: ProductDetail): Floating[] {
  const specs = new Map(product.specs.map((spec) => [spec.key, spec.value]));
  const cards: Floating[] = SPEC_CARDS.filter(({ key }) => specs.has(key)).map((card) => ({
    ...card,
    value: specs.get(card.key) as string,
  }));
  const power = parseWatts(specs.get("estimated_power"));
  const psu = parseWatts(specs.get("psu"));
  if (power && psu) {
    cards.splice(Math.min(2, cards.length), 0, {
      key: "power",
      label: "Consumo estimado",
      value: `~${power} W / ${psu} W`,
      Icon: ZapIcon,
      load: Math.min(100, Math.round((power / psu) * 100)),
    });
  }
  return cards.slice(0, 3);
}

/**
 * Hero asimétrico: titular a la izquierda y, a la derecha, el equipo destacado
 * con tarjetas flotantes de sus especificaciones reales que reaccionan al cursor.
 * Sin equipos en el catálogo muestra el servicio de armado, sin datos inventados.
 */
export function Hero({
  product,
  prebuiltHref,
  hasDeals,
  stats,
}: {
  product: ProductDetail | null;
  prebuiltHref: AppHref | null;
  hasDeals: boolean;
  stats: { products: number; categories: number };
}) {
  const floating = product ? floatingSpecs(product) : [];

  return (
    <section className="relative overflow-hidden bg-card dark:bg-background">
      {/* Luz ambiental lima y azul, tenue, y retícula técnica decorativa */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-56 right-[-12%] size-[44rem] rounded-full bg-primary/10 blur-3xl dark:bg-primary/8"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 left-[30%] size-[30rem] rounded-full bg-tech/8 blur-3xl dark:bg-tech/12"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_72%_45%,black,transparent_68%)] bg-size-[48px_48px] opacity-[0.35]"
      />

      <div className="relative container-page grid items-center gap-12 py-12 md:py-16 lg:grid-cols-[1.08fr_1fr] lg:gap-12 lg:py-24 xl:gap-20">
        <div className="grid content-center gap-7">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-eyebrow text-primary">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            Componentes · Computadores · Periféricos
          </p>
          <h1 className="text-4xl leading-[1.02] font-extrabold text-balance font-stretch-125% sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
            Hardware para PC con <span className="text-primary">ficha técnica completa</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Compara especificaciones reales, revisa la disponibilidad al momento y encuentra cada
            pieza por nombre, marca o SKU.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-glow">
              <Link href="/productos">
                Explorar catálogo
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
            {hasDeals && (
              <Button asChild size="lg" variant="outline">
                <Link href="/productos?oferta=1">Ver ofertas</Link>
              </Button>
            )}
            {prebuiltHref && (
              <Button asChild size="lg" variant="ghost">
                <Link href={toRoute(prebuiltHref)}>Ver computadores</Link>
              </Button>
            )}
          </div>
          {stats.products > 0 && (
            <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t pt-6">
              {[
                ["Productos", stats.products],
                ["Categorías", stats.categories],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 border-l-2 border-primary pl-3">
                  <dt className="text-eyebrow text-muted-foreground">{label}</dt>
                  <dd className="font-heading text-2xl font-bold font-stretch-112% tabular-nums">
                    {Number(value).toLocaleString("es-CO")}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <PointerParallax className="relative mx-auto w-full max-w-xl lg:max-w-none lg:py-8 lg:pl-6 xl:pl-10">
          <div
            aria-hidden
            style={depth(6)}
            className="parallax-layer pointer-events-none absolute inset-[12%] rounded-full bg-primary/15 blur-3xl dark:bg-primary/10"
          />
          {product ? <FeaturedProduct product={product} /> : <BuildService />}

          {product ? (
            floating.length > 0 && (
              <ul
                aria-label="Componentes principales"
                className="relative mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:pointer-events-none lg:absolute lg:inset-0 lg:mt-0 lg:block"
              >
                {floating.map((card, index) => (
                  <FloatingCard key={card.key} card={card} index={index} />
                ))}
              </ul>
            )
          ) : (
            <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
              {(
                [
                  { key: "gpu", label: "GPU", value: "Tarjeta gráfica", Icon: GpuIcon },
                  { key: "cpu", label: "CPU", value: "Procesador", Icon: CpuIcon },
                  { key: "ram", label: "RAM", value: "Memoria", Icon: MemoryStickIcon },
                ] satisfies Floating[]
              ).map((card, index) => (
                <FloatingCard key={card.key} card={card} index={index} as="div" />
              ))}
            </div>
          )}
        </PointerParallax>
      </div>
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary to-transparent"
      />
    </section>
  );
}

const panelClass =
  "parallax-layer relative grid gap-5 rounded-3xl border bg-card/80 p-4 shadow-raised backdrop-blur sm:p-5";

function FeaturedProduct({ product }: { product: ProductDetail }) {
  const image = product.images[0] ?? product.image;
  return (
    <article aria-labelledby="hero-product" style={depth(10)} className={panelClass}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-background bg-[radial-gradient(70%_70%_at_50%_40%,color-mix(in_oklab,var(--tech)_16%,transparent),transparent_70%)]">
        <ProductImage
          image={image ? { path: image.path, alt: image.alt } : null}
          categorySlug={product.category.slug}
          fallbackAlt={product.name}
          sizes="(min-width: 64rem) 36rem, 100vw"
          priority
        />
      </div>
      <div className="grid gap-4 px-1 pb-1">
        <div className="grid gap-1.5">
          <span className="text-eyebrow text-muted-foreground">Equipo destacado</span>
          <h2 id="hero-product" className="text-xl leading-snug font-bold md:text-2xl">
            <Link href={`/productos/${product.slug}`} className="hover:text-primary">
              {product.name}
            </Link>
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-heading text-2xl font-bold font-stretch-112% tabular-nums">
            {formatCOP(product.price)}
          </span>
          <Button asChild variant="outline">
            <Link href={`/productos/${product.slug}`}>
              Ver equipo
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

/** Sin equipos publicados: el servicio de armado (texto del anuncio de la tienda). */
function BuildService() {
  return (
    <article aria-labelledby="hero-build" style={depth(10)} className={panelClass}>
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border bg-background bg-[radial-gradient(70%_70%_at_50%_40%,color-mix(in_oklab,var(--tech)_16%,transparent),transparent_70%)] p-[14%] text-muted-foreground">
        <CategoryIllustration categorySlug="computadores" />
      </div>
      <div className="grid gap-3 px-1 pb-1">
        <div className="grid gap-1.5">
          <span className="text-eyebrow text-muted-foreground">Computadores a la medida</span>
          <h2 id="hero-build" className="text-xl font-bold md:text-2xl">
            Armamos tu PC
          </h2>
          <p className="text-muted-foreground">
            Elige los componentes o cuéntanos para qué lo necesitas y te lo armamos.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/soporte">
            Hablar con nosotros
            <ArrowRightIcon aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function FloatingCard({
  card,
  index,
  as: Tag = "li",
}: {
  card: Floating;
  index: number;
  as?: "li" | "div";
}) {
  const place = PLACEMENT[index] ?? PLACEMENT[0];
  return (
    <Tag
      style={
        { ...depth(place?.depth ?? 16), "--delay": `${200 + index * 140}ms` } as React.CSSProperties
      }
      className={cn(
        "parallax-layer hero-float-in pointer-events-auto grid min-w-0 content-start gap-2 rounded-xl border bg-popover/85 p-3 shadow-raised backdrop-blur-md lg:absolute lg:w-60",
        place?.className,
        // En móvil van de a dos; la tercera ocupa la fila completa.
        index === 2 && "col-span-2 sm:col-span-1",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <card.Icon className="size-4" aria-hidden />
        </span>
        <span className="text-eyebrow text-muted-foreground">{card.label}</span>
      </div>
      <span className="line-clamp-2 text-sm leading-snug font-semibold">{card.value}</span>
      {card.load !== undefined && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
          role="meter"
          aria-label="Carga estimada de la fuente"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={card.load}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${card.load}%` }} />
        </div>
      )}
    </Tag>
  );
}
