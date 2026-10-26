import { CpuIcon } from "lucide-react";
import { RarityBadge } from "@/components/shop/rarity-badge";
import { rarityStyle, type Rarity } from "@/features/rarities/types";
import { cn } from "@/lib/utils";

/** Tarjeta de muestra con el color y el efecto, igual a como se ve en la tienda. */
export function RarityPreview({
  rarity,
  label = "Así se ve en la tienda",
  className,
}: {
  rarity: Pick<Rarity, "name" | "color" | "effect">;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${label}: tarjeta con rareza ${rarity.name || "sin nombre"}`}
      data-effect={rarity.effect}
      style={rarityStyle(rarity)}
      className={cn(
        "rarity-card relative flex w-full max-w-56 flex-col overflow-hidden rounded-xl border bg-card",
        className,
      )}
    >
      <div className="relative grid aspect-[4/3] place-items-center bg-secondary">
        <CpuIcon className="size-12 text-muted-foreground/60" aria-hidden />
        <RarityBadge
          rarity={{ ...rarity, name: rarity.name || "Rareza" }}
          className="absolute top-2.5 right-2.5"
        />
      </div>
      <div className="grid gap-1.5 p-3">
        <span className="h-2 w-16 rounded-full bg-muted-foreground/25" />
        <span className="h-3 w-4/5 rounded-full bg-foreground/20" />
        <span className="mt-1 h-3.5 w-1/2 rounded-full bg-foreground/35" />
      </div>
    </div>
  );
}
