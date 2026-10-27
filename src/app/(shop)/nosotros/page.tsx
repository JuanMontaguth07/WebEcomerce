import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { AboutMilestones } from "@/components/shop/about-section";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { ABOUT } from "@/content/nosotros";
import { baseOpenGraph } from "@/lib/seo";

const description = ABOUT.paragraphs[0];

export const metadata: Metadata = {
  title: ABOUT.title,
  description,
  alternates: { canonical: "/nosotros" },
  openGraph: {
    ...baseOpenGraph,
    title: `${ABOUT.title} · ${siteConfig.name}`,
    description,
    url: "/nosotros",
  },
};

export default function AboutPage() {
  const [lead, ...rest] = ABOUT.paragraphs;

  return (
    <main id="contenido" className="grid gap-16 pb-8">
      <section className="relative overflow-hidden border-b bg-card dark:bg-background">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] size-[36rem] rounded-full bg-primary/12 blur-3xl dark:bg-primary/10"
        />
        <div className="relative container-page grid gap-6 py-12 md:py-20">
          <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: ABOUT.title }]} />
          <p className="text-eyebrow text-primary">{siteConfig.name}</p>
          <h1 className="max-w-4xl text-4xl leading-[1.05] font-extrabold font-stretch-125% md:text-6xl">
            {ABOUT.headline}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">{lead}</p>
        </div>
      </section>

      <div className="container-page grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-20">
        <article className="grid max-w-[65ch] content-start gap-5 text-lg leading-relaxed">
          <h2 className="sr-only">Nuestra historia</h2>
          {rest.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
          <blockquote className="mt-4 border-l-4 border-primary pl-6 font-heading text-2xl leading-snug font-bold md:text-3xl">
            {ABOUT.closing}
          </blockquote>
        </article>

        <aside aria-labelledby="camino" className="grid content-start gap-6">
          <h2 id="camino" className="text-eyebrow text-primary">
            El camino
          </h2>
          <AboutMilestones />
        </aside>
      </div>

      <section className="container-page">
        {/* Recuadro rojo de marca: usa el rojo de cada tema y su color de texto. */}
        <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-glow sm:p-12">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-primary-foreground/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="grid gap-2">
              <h2 className="text-2xl font-extrabold md:text-3xl">Sé parte de la historia</h2>
              <p>
                Encuentra componentes, computadores y periféricos con su ficha técnica completa.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link href="/productos">
                Explorar catálogo
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
