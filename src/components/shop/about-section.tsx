import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { ABOUT } from "@/content/nosotros";
import { cn } from "@/lib/utils";

/** El camino recorrido: pasos numerados sobre una línea roja. */
export function AboutMilestones({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* Línea que une los pasos */}
      <span
        aria-hidden
        className="absolute top-3 bottom-3 left-4.75 w-px bg-linear-to-b from-primary via-primary/50 to-transparent"
      />
      <ol className="relative grid gap-7">
        {ABOUT.milestones.map((milestone, index) => (
          <li key={milestone.title} className="relative flex gap-5">
            <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 border-primary bg-card font-mono text-sm font-bold text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="grid gap-1 pt-1.5">
              <h3 className="text-lg font-bold">{milestone.title}</h3>
              <p className="text-sm text-muted-foreground">{milestone.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Portada: versión corta de la historia, con enlace a /nosotros. */
export function AboutSection() {
  const [intro, , turningPoint] = ABOUT.paragraphs;

  return (
    <section aria-labelledby="nosotros" className="reveal container-page">
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-card">
        {/* Franja roja y resplandor de marca */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
        <span
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:p-14">
          <div className="grid content-start gap-5">
            <p className="text-eyebrow text-primary">{ABOUT.title}</p>
            <h2 id="nosotros" className="text-3xl leading-tight font-extrabold md:text-4xl">
              {ABOUT.headline}
            </h2>
            <p className="text-lg text-muted-foreground">{intro}</p>
            <p className="text-muted-foreground">{turningPoint}</p>
            <Link
              href="/nosotros"
              className="group inline-flex w-fit items-center gap-2 font-semibold text-primary hover:underline"
            >
              Conoce nuestra historia
              <ArrowRightIcon
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
          <AboutMilestones />
        </div>
      </div>
    </section>
  );
}
