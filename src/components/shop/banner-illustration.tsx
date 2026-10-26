import type { BannerIllustration as Kind } from "@/features/banners/types";
import { cn } from "@/lib/utils";

/**
 * Ilustraciones de los anuncios cuando no hay imagen subida. Línea técnica en
 * el color del texto con acentos del color de la marca; siguen el tema.
 */
const DRAWINGS: Record<Kind, React.ReactNode> = {
  build: (
    <>
      {/* Torre con panel de vidrio, ventiladores y tarjeta gráfica */}
      <rect x="62" y="18" width="116" height="148" rx="10" />
      <rect x="74" y="30" width="72" height="124" rx="5" className="opacity-60" />
      <circle cx="162" cy="48" r="9" />
      <circle cx="162" cy="76" r="9" />
      <circle cx="162" cy="104" r="9" />
      <path
        d="M162 39v18M153 48h18M162 67v18M153 76h18M162 95v18M153 104h18"
        className="opacity-50"
      />
      <rect x="82" y="40" width="40" height="30" rx="3" />
      <rect
        x="92"
        y="48"
        width="20"
        height="14"
        rx="2"
        className="fill-primary/20 stroke-primary"
      />
      <rect
        x="82"
        y="86"
        width="56"
        height="18"
        rx="3"
        className="fill-primary/15 stroke-primary"
      />
      <circle cx="96" cy="95" r="5" className="stroke-primary" />
      <circle cx="122" cy="95" r="5" className="stroke-primary" />
      <path d="M82 118h56M82 126h40" className="opacity-50" />
      <path d="M70 166v6M170 166v6" />
      {/* Destornillador */}
      <path d="M22 150l26-26M48 124l8-8 6 6-8 8z" className="stroke-primary" />
    </>
  ),
  support: (
    <>
      {/* Audífonos con micrófono y burbujas de chat */}
      <path d="M48 104V88a44 44 0 0 1 88 0v16" />
      <rect
        x="38"
        y="98"
        width="20"
        height="36"
        rx="8"
        className="fill-primary/20 stroke-primary"
      />
      <rect
        x="126"
        y="98"
        width="20"
        height="36"
        rx="8"
        className="fill-primary/20 stroke-primary"
      />
      <path d="M136 134c0 14-14 22-34 22" />
      <circle cx="98" cy="156" r="5" className="fill-primary stroke-primary" />
      <path d="M150 30h64a10 10 0 0 1 10 10v28a10 10 0 0 1-10 10h-42l-14 12V78h-8a10 10 0 0 1-10-10V40a10 10 0 0 1 10-10z" />
      <path d="M164 48h40M164 60h26" className="stroke-primary" />
      <path
        d="M170 104h44a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8h-8v10l-12-10h-24a8 8 0 0 1-8-8v-18a8 8 0 0 1 8-8z"
        className="opacity-60"
      />
    </>
  ),
  shipping: (
    <>
      {/* Caja con cinta y líneas de movimiento */}
      <path d="M70 62l60-26 60 26v70l-60 26-60-26z" />
      <path d="M70 62l60 26 60-26M130 88v70" />
      <path d="M100 49l60 26v22" className="stroke-primary" />
      <path d="M150 112l24-10v16l-24 10z" className="fill-primary/20 stroke-primary" />
      <path d="M20 84h34M30 104h26M14 124h40" className="opacity-60" />
    </>
  ),
  warranty: (
    <>
      {/* Escudo con chulo */}
      <path d="M120 20l56 20v44c0 38-24 62-56 76-32-14-56-38-56-76V40z" />
      <path d="M120 36l42 15v33c0 28-17 47-42 59" className="opacity-50" />
      <path d="M94 92l18 18 36-38" className="stroke-primary" strokeWidth="6" />
      <circle cx="40" cy="48" r="4" className="fill-primary stroke-primary" />
      <circle cx="200" cy="132" r="4" className="fill-primary stroke-primary" />
      <path d="M190 34l6 6M196 34l-6 6M34 132l6 6M40 132l-6 6" className="opacity-60" />
    </>
  ),
  deals: (
    <>
      {/* Etiqueta de precio con porcentaje */}
      <path d="M48 70l58-52h82v82l-58 58a10 10 0 0 1-14 0l-68-68a10 10 0 0 1 0-14z" />
      <circle cx="164" cy="44" r="9" className="fill-primary/20 stroke-primary" />
      <path d="M96 118l48-48" className="stroke-primary" strokeWidth="5" />
      <circle cx="100" cy="80" r="9" className="stroke-primary" />
      <circle cx="140" cy="110" r="9" className="stroke-primary" />
      <path d="M196 120l20 6M190 140l14 14M214 96l8-6" className="opacity-60" />
    </>
  ),
  upgrade: (
    <>
      {/* Chip con flecha de mejora */}
      <rect x="66" y="60" width="92" height="92" rx="8" />
      <rect
        x="86"
        y="80"
        width="52"
        height="52"
        rx="4"
        className="fill-primary/15 stroke-primary"
      />
      <path
        d="M82 60v-10M100 60v-10M118 60v-10M136 60v-10M82 152v10M100 152v10M118 152v10M136 152v10M66 76H56M66 94H56M66 112H56M66 130H56M158 76h10M158 94h10M158 112h10M158 130h10"
        className="opacity-60"
      />
      <path d="M190 120V28M172 46l18-18 18 18" className="stroke-primary" strokeWidth="5" />
      <path d="M112 116V96M104 104l8-8 8 8" className="stroke-primary" />
    </>
  ),
};

export function BannerIllustration({ kind, className }: { kind: Kind; className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-foreground/70", className)}
      aria-hidden
    >
      {DRAWINGS[kind]}
    </svg>
  );
}
