import { cn } from "@/lib/utils";

// Tema claro: cuadro casi negro con un brillo apenas visible arriba. Tema oscuro:
// cristal teñido del color del módulo (un cuadro negro se perdería en el fondo).
const BASE =
  "bg-[linear-gradient(160deg,#1d2129,#0b0d11)] shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_1px_2px_rgb(0_0_0/0.25)] ring-1 ring-inset dark:bg-none dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]";

/**
 * Íconos del panel en estilo minimalista: trazo fino en el color del módulo (o
 * del tipo de alerta) con un borde tenue del mismo color; en tema claro sobre un
 * cuadro casi negro y en tema oscuro sobre un cristal de su color.
 * «accent» toma el color que el admin eligió en «Mi cuenta».
 */
export const TILE_TONES = {
  green: `${BASE} text-[#4ade80] ring-[#4ade80]/25 dark:bg-[#4ade80]/12 dark:ring-[#4ade80]/35`,
  blue: `${BASE} text-[#60a5fa] ring-[#60a5fa]/25 dark:bg-[#60a5fa]/12 dark:ring-[#60a5fa]/35`,
  amber: `${BASE} text-[#fbbf24] ring-[#fbbf24]/25 dark:bg-[#fbbf24]/12 dark:ring-[#fbbf24]/35`,
  red: `${BASE} text-[#fb7185] ring-[#fb7185]/25 dark:bg-[#fb7185]/12 dark:ring-[#fb7185]/35`,
  violet: `${BASE} text-[#a78bfa] ring-[#a78bfa]/25 dark:bg-[#a78bfa]/12 dark:ring-[#a78bfa]/35`,
  pink: `${BASE} text-[#f472b6] ring-[#f472b6]/25 dark:bg-[#f472b6]/12 dark:ring-[#f472b6]/35`,
  teal: `${BASE} text-[#2dd4bf] ring-[#2dd4bf]/25 dark:bg-[#2dd4bf]/12 dark:ring-[#2dd4bf]/35`,
  orange: `${BASE} text-[#fb923c] ring-[#fb923c]/25 dark:bg-[#fb923c]/12 dark:ring-[#fb923c]/35`,
  sky: `${BASE} text-[#38bdf8] ring-[#38bdf8]/25 dark:bg-[#38bdf8]/12 dark:ring-[#38bdf8]/35`,
  indigo: `${BASE} text-[#818cf8] ring-[#818cf8]/25 dark:bg-[#818cf8]/12 dark:ring-[#818cf8]/35`,
  cyan: `${BASE} text-[#22d3ee] ring-[#22d3ee]/25 dark:bg-[#22d3ee]/12 dark:ring-[#22d3ee]/35`,
  slate: `${BASE} text-[#cbd5e1] ring-[#cbd5e1]/20 dark:bg-[#94a3b8]/12 dark:ring-[#94a3b8]/30`,
  // En tema claro el acento es oscuro: se aclara para que se lea sobre el cuadro.
  accent: `${BASE} text-[color:color-mix(in_oklab,var(--primary)_55%,white)] ring-[color:color-mix(in_oklab,var(--primary)_40%,transparent)] dark:bg-primary/12 dark:text-primary dark:ring-primary/35`,
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
