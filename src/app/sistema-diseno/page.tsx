import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { discountPercent, formatCOP } from "@/lib/format";
import { AddToCartDemo, FormDemo } from "./_components/interactive-demo";

// Página interna de referencia visual. No existe en producción.
export const metadata: Metadata = {
  title: "Sistema de diseño",
  robots: { index: false, follow: false },
};

const COLOR_TOKENS = [
  ["background", "Fondo de página"],
  ["card", "Tarjetas, navbar"],
  ["secondary", "Campos, chips, hover"],
  ["border", "Divisores"],
  ["input", "Bordes de campos"],
  ["foreground", "Texto principal"],
  ["muted-foreground", "Texto secundario"],
  ["primary", "Acción principal, foco"],
  ["primary-soft", "Fondos de acento"],
  ["lime", "Neón de marca: luces y halos"],
  ["tech", "Azul tecnológico, con moderación"],
  ["sale", "Ofertas y descuentos"],
  ["success", "En stock, éxito"],
  ["warning", "Stock bajo"],
  ["destructive", "Agotado, error"],
] as const;

const TYPE_SCALE = [
  ["text-5xl", "Hardware con ficha técnica"],
  ["text-3xl", "Tarjetas gráficas"],
  ["text-xl", "Especificaciones"],
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-5">
      <h2 id={id} className="text-2xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const price = 2849900;
  const compareAt = 3239900;

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <span className="font-heading text-base font-extrabold font-stretch-125%">
            Sistema de diseño
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main id="contenido" className="container-page grid gap-16 py-12">
        <div className="grid gap-4">
          <p className="text-eyebrow text-muted-foreground">Referencia interna</p>
          <h1 className="text-4xl font-extrabold font-stretch-125% md:text-5xl">
            Carbón y grafito, con el lima eléctrico como marca
          </h1>
          <p className="max-w-prose text-lg text-muted-foreground">
            Todos los componentes consumen tokens semánticos; cambia el tema con el selector de
            arriba para revisar ambos. Los productos y precios son datos de demostración.
          </p>
        </div>

        <Section id="colores" title="Colores">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLOR_TOKENS.map(([token, usage]) => (
              <li key={token} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <span
                  className="size-10 shrink-0 rounded-md border"
                  style={{ background: `var(--${token})` }}
                  aria-hidden
                />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-mono text-xs">--{token}</span>
                  <span className="truncate text-xs text-muted-foreground">{usage}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="tipografia" title="Tipografía">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="grid content-start gap-2 border-t-2 border-foreground pt-4">
              <span className="text-eyebrow text-muted-foreground">Display · Mona Sans</span>
              {TYPE_SCALE.map(([size, text]) => (
                <span
                  key={size}
                  className={`${size} font-heading leading-tight font-extrabold font-stretch-125%`}
                >
                  {text}
                </span>
              ))}
            </div>
            <div className="grid content-start gap-2 border-t-2 border-foreground pt-4">
              <span className="text-eyebrow text-muted-foreground">Texto · Instrument Sans</span>
              <p className="text-lg">Envío a toda Colombia, con seguimiento del pedido.</p>
              <p className="text-muted-foreground">
                Descripciones, formularios y navegación. Legible en pantallas pequeñas.
              </p>
            </div>
            <div className="grid content-start gap-2 border-t-2 border-foreground pt-4">
              <span className="text-eyebrow text-muted-foreground">Datos · IBM Plex Mono</span>
              <p className="font-mono text-base">SKU CPU-DEMO-8C</p>
              <p className="font-mono text-sm text-muted-foreground tabular-nums">
                8C/16T · 5.5 GHz · 65 W
              </p>
            </div>
          </div>
        </Section>

        <Section id="botones" title="Botones">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Comprar</Button>
            <Button variant="secondary">Comparar</Button>
            <Button variant="outline">Filtrar</Button>
            <Button variant="ghost">Ver especificaciones</Button>
            <Button variant="link">Términos de garantía</Button>
            <Button disabled>Agotado</Button>
            <Button isLoading>Procesando</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeño</Button>
            <Button>Normal</Button>
            <Button size="lg">Grande</Button>
          </div>
          <Separator />
          <AddToCartDemo />
        </Section>

        <Section id="estados" title="Estados de inventario">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">En stock</Badge>
            <Badge variant="warning">Quedan 3</Badge>
            <Badge variant="destructive">Agotado</Badge>
            <Badge variant="sale">-12%</Badge>
            <Badge variant="soft">Nuevo</Badge>
            <Badge variant="outline">Envío gratis</Badge>
          </div>
        </Section>

        <Section id="tarjetas" title="Tarjetas">
          <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <article className="group overflow-hidden rounded-xl border bg-card transition-[transform,box-shadow,border-color] duration-300 ease-out-soft hover:-translate-y-1 hover:border-primary/40 hover:shadow-raised">
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-secondary">
                <Badge className="absolute top-3 left-3">
                  -{discountPercent(price, compareAt)}%
                </Badge>
                <svg
                  viewBox="0 0 160 80"
                  className="w-3/4 text-muted-foreground transition-transform duration-500 ease-out-soft group-hover:scale-105"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <rect x="6" y="14" width="148" height="46" rx="5" />
                  <circle cx="46" cy="37" r="15" />
                  <circle cx="114" cy="37" r="15" />
                  <path d="M20 60v8h50v-8" />
                </svg>
              </div>
              <div className="grid gap-2 p-4">
                <span className="text-eyebrow text-muted-foreground">Demo · SKU DEMO-GPU-12G</span>
                <h3 className="font-sans text-base font-semibold font-stretch-normal">
                  Tarjeta gráfica DEMO 12 GB
                </h3>
                <div className="flex flex-wrap gap-1">
                  {["12 GB GDDR7", "PCIe 5.0", "250 W"].map((spec) => (
                    <span
                      key={spec}
                      className="rounded bg-secondary px-1.5 py-1 font-mono text-[0.6875rem] leading-none text-muted-foreground"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
                  <strong className="font-heading text-xl font-bold font-stretch-112%">
                    {formatCOP(price)}
                  </strong>
                  <s className="text-sm text-muted-foreground">{formatCOP(compareAt)}</s>
                </div>
                <Badge variant="success">En stock</Badge>
              </div>
            </article>

            <Card>
              <CardHeader>
                <CardTitle>Garantía directa</CardTitle>
                <CardDescription>
                  Tarjeta informativa con borde y sombra del sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                En claro la profundidad viene de sombras suaves; en oscuro, de superficies
                escalonadas con un borde fino.
              </CardContent>
            </Card>

            <div className="grid content-start gap-3 rounded-xl border bg-card p-4" aria-busy>
              <span className="sr-only">Cargando productos…</span>
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </div>
        </Section>

        <Section id="formularios" title="Formularios">
          <div className="max-w-md rounded-xl border bg-card p-5">
            <FormDemo />
          </div>
        </Section>

        <Section id="movimiento" title="Aparición progresiva">
          <ul className="grid gap-3 sm:grid-cols-3">
            {["Hover de producto", "Feedback al agregar", "Transición de filtros"].map(
              (label, index) => (
                <li key={label}>
                  <Reveal delay={index * 0.08} className="rounded-lg border bg-card p-4 text-sm">
                    {label}
                  </Reveal>
                </li>
              ),
            )}
          </ul>
          <p className="text-sm text-muted-foreground">
            Con «reducir movimiento» activado en el sistema operativo, las animaciones se
            desactivan.
          </p>
        </Section>
      </main>
    </>
  );
}
