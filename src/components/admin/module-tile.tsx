import { cn } from "@/lib/utils";

// Cuadro casi negro con un brillo apenas visible arriba: igual en tema claro y oscuro.
const BASE =
  "bg-[linear-gradient(160deg,#1d2129,#0b0d11)] shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_1px_2px_rgb(0_0_0/0.25)] ring-1 ring-inset";

/**
 * Íconos del panel en estilo oscuro y minimalista: trazo fino en el color del
 * módulo (o del tipo de alerta) sobre un cuadro oscuro, con un borde tenue del
 * mismo color. Los tonos son claros para leerse sobre el fondo oscuro.
 * «accent» toma el color que el admin eligió en «Mi cuenta».
 */
export const TILE_TONES = {
  green: `${BASE} text-[#4ade80] ring-[#4ade80]/25`,
  blue: `${BASE} text-[#60a5fa] ring-[#60a5fa]/25`,
  amber: `${BASE} text-[#fbbf24] ring-[#fbbf24]/25`,
  red: `${BASE} text-[#fb7185] ring-[#fb7185]/25`,
  violet: `${BASE} text-[#a78bfa] ring-[#a78bfa]/25`,
  pink: `${BASE} text-[#f472b6] ring-[#f472b6]/25`,
  teal: `${BASE} text-[#2dd4bf] ring-[#2dd4bf]/25`,
  orange: `${BASE} text-[#fb923c] ring-[#fb923c]/25`,
  sky: `${BASE} text-[#38bdf8] ring-[#38bdf8]/25`,
  indigo: `${BASE} text-[#818cf8] ring-[#818cf8]/25`,
  cyan: `${BASE} text-[#22d3ee] ring-[#22d3ee]/25`,
  slate: `${BASE} text-[#cbd5e1] ring-[#cbd5e1]/20`,
  // En tema claro el acento es oscuro: se aclara para que se lea sobre el cuadro.
  accent: `${BASE} text-[color:color-mix(in_oklab,var(--primary)_55%,white)] ring-[color:color-mix(in_oklab,var(--primary)_40%,transparent)]`,
} as const;

export type TileTone = keyof typeof TILE_TONES;

/** Ícono cuadrado redondeado en el color de su módulo. */
export function ModuleTile({
  tone,
  Icon,
  className,
  iconClassName,
}: {
  tone: TileTone;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-[0.55rem]",
        TILE_TONES[tone],
        className,
      )}
    >
      <Icon className={cn("size-[54%]", iconClassName)} strokeWidth={1.75} />
    </span>
  );
}
