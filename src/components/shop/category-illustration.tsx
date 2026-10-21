import { cn } from "@/lib/utils";

/**
 * Ilustraciones técnicas en línea por categoría. Se usan cuando un producto
 * aún no tiene fotos y en las tarjetas de categoría. Heredan el color del texto.
 */
const DRAWINGS: Record<string, React.ReactNode> = {
  gpu: (
    <>
      <rect x="10" y="34" width="140" height="48" rx="6" />
      <circle cx="52" cy="58" r="16" />
      <circle cx="108" cy="58" r="16" />
      <circle cx="52" cy="58" r="4" />
      <circle cx="108" cy="58" r="4" />
      <path d="M24 82v10h52V82M150 46h6v24h-6" />
    </>
  ),
  cpu: (
    <>
      <rect x="46" y="26" width="68" height="68" rx="6" />
      <rect x="60" y="40" width="40" height="40" rx="3" />
      <path d="M58 26v-8M72 26v-8M86 26v-8M100 26v-8M58 94v8M72 94v8M86 94v8M100 94v8M46 38h-8M46 52h-8M46 66h-8M46 80h-8M114 38h8M114 52h8M114 66h8M114 80h8" />
    </>
  ),
  ram: (
    <>
      <path d="M14 44h132v28H90l-4 6h-12l-4-6H14z" />
      <rect x="24" y="50" width="16" height="14" rx="1" />
      <rect x="48" y="50" width="16" height="14" rx="1" />
      <rect x="96" y="50" width="16" height="14" rx="1" />
      <rect x="120" y="50" width="16" height="14" rx="1" />
      <path d="M22 72v8M34 72v8M46 72v8M58 72v8M102 72v8M114 72v8M126 72v8M138 72v8" />
    </>
  ),
  storage: (
    <>
      <rect x="18" y="48" width="124" height="26" rx="4" />
      <rect x="30" y="54" width="28" height="14" rx="1" />
      <rect x="66" y="54" width="20" height="14" rx="1" />
      <circle cx="132" cy="61" r="3" />
      <path d="M18 56h-6v10h6" />
    </>
  ),
  motherboard: (
    <>
      <rect x="30" y="14" width="100" height="92" rx="4" />
      <rect x="44" y="28" width="28" height="28" rx="2" />
      <path d="M84 28v40M92 28v40M100 28v40M108 28v40" />
      <rect x="40" y="76" width="80" height="8" rx="1" />
      <rect x="40" y="90" width="56" height="6" rx="1" />
      <path d="M30 34h-6M30 46h-6M30 58h-6" />
    </>
  ),
  psu: (
    <>
      <rect x="22" y="28" width="116" height="66" rx="5" />
      <circle cx="68" cy="61" r="24" />
      <path d="M68 37v48M44 61h48M51 44l34 34M85 44L51 78" />
      <rect x="104" y="44" width="22" height="12" rx="2" />
      <path d="M108 70h14M108 78h14" />
    </>
  ),
  case: (
    <>
      <rect x="44" y="10" width="72" height="100" rx="6" />
      <rect x="54" y="20" width="40" height="80" rx="2" />
      <circle cx="105" cy="34" r="6" />
      <circle cx="105" cy="54" r="6" />
      <path d="M100 92h10M54 100v6M106 100v6" />
    </>
  ),
  cooling: (
    <>
      <rect x="20" y="22" width="56" height="76" rx="4" />
      <circle cx="48" cy="44" r="14" />
      <circle cx="48" cy="76" r="14" />
      <path d="M76 44c22 0 22 28 44 28M76 76c18 0 18-10 36-10" />
      <rect x="112" y="56" width="28" height="28" rx="6" />
      <circle cx="126" cy="70" r="6" />
    </>
  ),
  pc: (
    <>
      <rect x="52" y="10" width="64" height="100" rx="6" />
      <rect x="60" y="20" width="34" height="38" rx="2" strokeDasharray="3 3" />
      <rect x="60" y="66" width="48" height="10" rx="1" />
      <circle cx="104" cy="28" r="5" />
      <circle cx="104" cy="44" r="5" />
      <path d="M60 94h48M28 104h24M116 104h20" />
    </>
  ),
  monitor: (
    <>
      <rect x="14" y="16" width="132" height="76" rx="5" />
      <rect x="22" y="24" width="116" height="60" rx="2" strokeDasharray="3 3" />
      <path d="M70 92l-6 16h32l-6-16M56 108h48" />
    </>
  ),
  generic: (
    <>
      <rect x="30" y="24" width="100" height="72" rx="8" />
      <path d="M30 48h100M54 24v24M106 24v24" />
      <circle cx="80" cy="72" r="10" />
    </>
  ),
};

const CATEGORY_DRAWING: Record<string, keyof typeof DRAWINGS> = {
  "tarjetas-graficas": "gpu",
  procesadores: "cpu",
  "memorias-ram": "ram",
  almacenamiento: "storage",
  "placas-madre": "motherboard",
  "fuentes-de-poder": "psu",
  gabinetes: "case",
  refrigeracion: "cooling",
  computadores: "pc",
  monitores: "monitor",
};

export function CategoryIllustration({
  categorySlug,
  className,
}: {
  categorySlug: string;
  className?: string;
}) {
  const drawing = DRAWINGS[CATEGORY_DRAWING[categorySlug] ?? "generic"];
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-auto w-full", className)}
      aria-hidden
    >
      {drawing}
    </svg>
  );
}
