import { GemIcon } from "lucide-react";
import { rarityStyle, type Rarity } from "@/features/rarities/types";
import { cn } from "@/lib/utils";

/** Etiqueta de rareza: el color va en el borde, el fondo y el ícono; el texto en el color normal. */
export function RarityBadge({
  rarity,
  size = "sm",
  className,
}: {
  rarity: Pick<Rarity, "name" | "color" | "effect">;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      data-effect={rarity.effect}
      style={rarityStyle(rarity)}
      className={cn(
        "rarity-badge inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap text-foreground",
        size === "sm" ? "px-2.5 py-1 text-xs leading-none" : "px-3.5 py-1.5 text-sm",
        className,
      )}
    >
      <GemIcon
        className={cn("shrink-0 text-(--rarity)", size === "sm" ? "size-3" : "size-4")}
        aria-hidden
      />
      <span className="sr-only">Rareza: </span>
      {rarity.name}
    </span>
  );
}
