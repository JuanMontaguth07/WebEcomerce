import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { toRoute, type AppHref } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  id: string;
  title: string;
  /** Número de la sección en la portada («01»). */
  index?: number;
  eyebrow?: string;
  description?: string;
  href?: AppHref;
  linkLabel?: string;
  /** start: todo a la izquierda · split: título y texto en columnas · center: centrado. */
  align?: "start" | "split" | "center";
  tone?: "default" | "sale";
  className?: string;
};

/** Encabezado de sección con número, antetítulo y enlace; varía para no repetir la portada. */
export function SectionHeader({
  id,
  title,
  index,
  eyebrow,
  description,
  href,
  linkLabel,
  align = "start",
  tone = "default",
  className,
}: SectionHeaderProps) {
  const accent = tone === "sale" ? "text-sale" : "text-primary";
  const link = href && (
    <Link
      href={toRoute(href)}
      className={cn(
        "group inline-flex w-fit shrink-0 items-center gap-1.5 text-sm font-semibold hover:underline",
        accent,
      )}
    >
      {linkLabel ?? "Ver todo"}
      <ArrowRightIcon
        className="size-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
  const kicker = (index !== undefined || eyebrow) && (
    <p className={cn("flex items-center gap-2 text-eyebrow", accent)}>
      {index !== undefined && (
        <span className="tabular-nums">{String(index).padStart(2, "0")}</span>
      )}
      {index !== undefined && eyebrow && (
        <span aria-hidden className="h-px w-6 bg-current opacity-60" />
      )}
      {eyebrow}
    </p>
  );
  const heading = (
    <h2
      id={id}
      className="text-3xl leading-[1.05] font-extrabold text-balance font-stretch-112% md:text-4xl"
    >
      {title}
    </h2>
  );

  if (align === "center") {
    return (
      <div className={cn("grid justify-items-center gap-3 text-center", className)}>
        {kicker}
        {heading}
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
        {link}
      </div>
    );
  }

  if (align === "split") {
    return (
      <div
        className={cn(
          "grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-end",
          className,
        )}
      >
        <div className="grid gap-3">
          {kicker}
          {heading}
        </div>
        <div className="grid gap-3 md:justify-items-end md:text-right">
          {description && <p className="text-muted-foreground">{description}</p>}
          {link}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="grid gap-3">
        {kicker}
        {heading}
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {link}
    </div>
  );
}
