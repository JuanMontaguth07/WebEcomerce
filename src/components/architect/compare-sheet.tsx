"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { compareParts } from "@/features/architect/build";
import type { ArchitectPart } from "@/features/architect/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PartThumb } from "./part-thumb";

/** Dos piezas lado a lado: precio, stock y ficha con la diferencia escrita en claro. */
export function CompareSheet({
  parts,
  open,
  onOpenChange,
  onChoose,
}: {
  parts: [ArchitectPart, ArchitectPart] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (part: ArchitectPart) => void;
}) {
  if (!parts) return null;
  const [a, b] = parts;
  const rows = compareParts(a, b);
  const priceGap = Math.abs(a.price - b.price);
  const cheaper = a.price === b.price ? null : a.price < b.price ? "a" : "b";

  const cell = (
    side: "a" | "b",
    value: string | null,
    difference: (typeof rows)[number]["difference"],
  ) => (
    <td className="px-3 py-2.5 align-top">
      <span className="grid gap-1">
        <span className={cn(!value && "text-muted-foreground")}>{value ?? "Sin dato"}</span>
        {difference?.side === side && (
          <Badge variant="soft" className="w-fit">
            {difference.text}
          </Badge>
        )}
      </span>
    </td>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-heading font-stretch-112%">Comparar piezas</SheetTitle>
          <SheetDescription>
            Las diferencias se calculan con la ficha técnica de cada pieza.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="align-top">
                <th scope="col" className="w-1/4 px-3 pb-4 text-left">
                  <span className="sr-only">Característica</span>
                </th>
                {[a, b].map((part) => (
                  <th key={part.id} scope="col" className="px-3 pb-4 text-left font-normal">
                    <span className="grid gap-2">
                      <PartThumb part={part} className="w-20" />
                      <span className="font-semibold">{part.name}</span>
                      {part.demo && (
                        <Badge variant="outline" className="w-fit">
                          Demo
                        </Badge>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="w-fit"
                        onClick={() => onChoose(part)}
                      >
                        Elegir esta
                      </Button>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y border-y">
              <tr>
                <th scope="row" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Precio
                </th>
                {(["a", "b"] as const).map((side) => {
                  const part = side === "a" ? a : b;
                  return (
                    <td key={side} className="px-3 py-2.5 align-top">
                      <span className="grid gap-1">
                        <span className="font-mono tabular-nums">{formatCOP(part.price)}</span>
                        {cheaper === side && (
                          <Badge variant="soft" className="w-fit">
                            {formatCOP(priceGap)} menos
                          </Badge>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Disponibilidad
                </th>
                {[a, b].map((part) => (
                  <td key={part.id} className="px-3 py-2.5">
                    {part.stock === null
                      ? "Pieza demo"
                      : part.stock > 0
                        ? `${part.stock} en stock`
                        : "Agotado"}
                  </td>
                ))}
              </tr>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th
                    scope="row"
                    className="px-3 py-2.5 text-left font-medium text-muted-foreground"
                  >
                    {row.label}
                  </th>
                  {cell("a", row.a, row.difference)}
                  {cell("b", row.b, row.difference)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
