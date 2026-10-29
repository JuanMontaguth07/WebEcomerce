import { cn } from "@/lib/utils";

/**
 * Degradados de «app» como los íconos de iOS (ícono blanco encima): cada módulo
 * del panel y cada tipo de alerta tiene el suyo. Se ven igual en ambos temas.
 * «accent» toma el color que el admin eligió en «Mi cuenta».
 */
export const TILE_TONES = {
  green: "bg-[linear-gradient(145deg,#4ade80,#059669)] shadow-[0_4px_14px_-4px_#05966999]",
  blue: "bg-[linear-gradient(145deg,#60a5fa,#2563eb)] shadow-[0_4px_14px_-4px_#2563eb99]",
  amber: "bg-[linear-gradient(145deg,#fcd34d,#d97706)] shadow-[0_4px_14px_-4px_#d9770699]",
  red: "bg-[linear-gradient(145deg,#fb7185,#e11d48)] shadow-[0_4px_14px_-4px_#e11d4899]",
  violet: "bg-[linear-gradient(145deg,#c4b5fd,#7c3aed)] shadow-[0_4px_14px_-4px_#7c3aed99]",
  pink: "bg-[linear-gradient(145deg,#f9a8d4,#db2777)] shadow-[0_4px_14px_-4px_#db277799]",
  teal: "bg-[linear-gradient(145deg,#5eead4,#0d9488)] shadow-[0_4px_14px_-4px_#0d948899]",
  orange: "bg-[linear-gradient(145deg,#fdba74,#ea580c)] shadow-[0_4px_14px_-4px_#ea580c99]",
  sky: "bg-[linear-gradient(145deg,#7dd3fc,#0284c7)] shadow-[0_4px_14px_-4px_#0284c799]",
  indigo: "bg-[linear-gradient(145deg,#a5b4fc,#4f46e5)] shadow-[0_4px_14px_-4px_#4f46e599]",
  cyan: "bg-[linear-gradient(145deg,#67e8f9,#0891b2)] shadow-[0_4px_14px_-4px_#0891b299]",
  slate: "bg-[linear-gradient(145deg,#94a3b8,#475569)] shadow-[0_4px_14px_-4px_#47556999]",
  accent:
    "bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_70%,white),var(--primary))] text-primary-foreground shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)]",
} as const;

export type TileTone = keyof typeof TILE_TONES;

/** Ícono cuadrado redondeado sobre el color de su módulo. */
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
        "grid size-7 shrink-0 place-items-center rounded-[0.55rem] text-white",
        TILE_TONES[tone],
        className,
      )}
    >
      <Icon className={cn("size-[58%]", iconClassName)} strokeWidth={2.25} />
    </span>
  );
}
