"use client";

import { CpuIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SelectField } from "@/components/admin/form-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applyArchitectTemplate } from "@/features/admin/catalog-actions";
import { ARCHITECT_TEMPLATES } from "@/features/compatibility/template";
import { PART_KINDS, PART_LABELS, type PartKind } from "@/features/compatibility/types";

/**
 * Indica qué pieza del PC es la categoría y completa su ficha con la plantilla de
 * Kova Architect. Solo agrega las especificaciones que faltan.
 */
export function ArchitectTemplate({
  categoryId,
  current,
  inherited,
  existingKeys,
}: {
  categoryId: string;
  current: PartKind | null;
  /** Pieza de la categoría principal, si esta es una subcategoría sin pieza propia. */
  inherited: { part: PartKind; from: string } | null;
  existingKeys: string[];
}) {
  const router = useRouter();
  const [part, setPart] = useState<PartKind | "">(current ?? "");
  const [pending, startTransition] = useTransition();
  const existing = new Set(existingKeys);
  const missing = part ? ARCHITECT_TEMPLATES[part].filter((item) => !existing.has(item.key)) : [];
  const unchanged = (part || null) === current && !missing.length;

  function apply() {
    startTransition(async () => {
      const result = await applyArchitectTemplate({ categoryId, part: part || null });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        !part
          ? "La categoría ya no participa en Kova Architect"
          : result.data.added
            ? `Plantilla aplicada: ${result.data.added} especificaciones nuevas`
            : "Pieza guardada. La ficha ya tenía todas las especificaciones",
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,18rem)_1fr] sm:items-end">
        <SelectField
          name="architectPart"
          label="Pieza que representa"
          errors={{}}
          value={part}
          onChange={(event) => setPart(event.target.value as PartKind | "")}
          options={[
            {
              value: "",
              label: inherited
                ? `Igual que «${inherited.from}» (${PART_LABELS[inherited.part]})`
                : "No participa",
            },
            ...PART_KINDS.map((kind) => ({ value: kind, label: PART_LABELS[kind] })),
          ]}
        />
        <Button
          type="button"
          onClick={apply}
          isLoading={pending}
          disabled={unchanged}
          className="w-fit"
        >
          <CpuIcon aria-hidden />
          {missing.length ? "Aplicar plantilla" : "Guardar pieza"}
        </Button>
      </div>
      {part && (
        <div className="grid gap-2 text-sm">
          {missing.length ? (
            <>
              <p className="text-muted-foreground">
                Se agregarán a la ficha técnica ({missing.length}). Lo que ya está cargado no
                cambia:
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <li key={item.key}>
                    <Badge variant={item.architect ? "soft" : "outline"} title={item.hint}>
                      {item.label}
                      {item.unit && ` (${item.unit})`}
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground">
              La ficha ya tiene todas las especificaciones de la plantilla.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
