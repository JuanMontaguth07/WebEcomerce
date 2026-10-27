import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Monograma: "K" sobre un cuadro rojo. También se usa en el ícono y la imagen para redes. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M11 8.5v15M21.5 8.5 14 16l7.5 7.5"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="22" y="14.4" width="3.2" height="3.2" rx="0.8" className="fill-primary-foreground" />
    </svg>
  );
}

/** Logotipo: monograma + nombre ("KOVA" protagonista, el resto como subtítulo). */
export function Logo({ className }: { className?: string }) {
  const [first, ...rest] = siteConfig.name.split(" ");

  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name}, ir al inicio`}
      className={cn(
        "group inline-flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        className,
      )}
    >
      <LogoMark className="transition-transform duration-300 ease-out-soft group-hover:-rotate-6" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-heading text-xl font-extrabold tracking-tight uppercase font-stretch-125%">
          {first}
        </span>
        {rest.length > 0 && <span className="text-eyebrow text-primary">{rest.join(" ")}</span>}
      </span>
    </Link>
  );
}
