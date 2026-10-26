import type { CSSProperties } from "react";

/** Nivel de calidad de un producto (tabla rarities). position mayor = mejor gama. */
export type Rarity = {
  id: string;
  name: string;
  slug: string;
  /** Color #RRGGBB elegido en el panel. Solo pinta bordes, brillos e íconos, nunca texto. */
  color: string;
  effect: RarityEffect;
  description: string | null;
  position: number;
  isActive: boolean;
};

export const RARITY_EFFECTS = {
  none: { label: "Sin efecto", hint: "Solo el borde y la etiqueta del color." },
  glow: { label: "Resplandor", hint: "Un halo suave del color alrededor de la tarjeta." },
  pulse: { label: "Latido", hint: "El halo se enciende y se apaga lentamente." },
  shimmer: { label: "Destello", hint: "Un reflejo de luz cruza la tarjeta cada pocos segundos." },
  holo: { label: "Holográfico", hint: "Borde iridiscente que gira, como una carta coleccionable." },
} as const;

export type RarityEffect = keyof typeof RARITY_EFFECTS;

export const RARITY_EFFECT_KEYS = Object.keys(RARITY_EFFECTS) as RarityEffect[];

/** Variable CSS que leen las clases `rarity-*` de globals.css. */
export function rarityStyle(rarity: Pick<Rarity, "color">): CSSProperties {
  return { "--rarity": rarity.color } as CSSProperties;
}
