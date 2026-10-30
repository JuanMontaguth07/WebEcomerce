"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ArchitectPart } from "@/features/architect/types";
import { PART_LABELS } from "@/features/compatibility/types";
import { PartThumb } from "./part-thumb";
import { PriceList } from "./price-compare";

/** Cada pieza del equipo con dónde conseguirla: aquí, en otras tiendas y búsquedas. */
export function WhereToBuySheet({
  parts,
  rate,
  open,
  onOpenChange,
}: {
  parts: ArchitectPart[];
  rate: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // El almacenamiento puede repetirse: cada pieza se muestra una vez.
  const unique = [
    ...new Map(parts.filter((part) => !part.demo).map((part) => [part.id, part])).values(),
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Dónde comprar cada pieza</SheetTitle>
          <SheetDescription>
            Lo que vendemos aquí y dónde más se consigue, con el más barato marcado.
          </SheetDescription>
        </SheetHeader>
        <ul className="grid gap-5 px-4 pb-6">
          {unique.map((part) => (
            <li key={part.id} className="grid gap-2">
              <div className="flex items-center gap-3">
                <PartThumb part={part} />
                <span className="grid min-w-0">
                  <span className="text-eyebrow text-muted-foreground">
                    {PART_LABELS[part.kind]}
                  </span>
                  <span className="truncate font-semibold">{part.name}</span>
                </span>
              </div>
              <PriceList part={part} rate={rate} />
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
