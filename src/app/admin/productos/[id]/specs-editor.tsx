"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fieldBase, Input } from "@/components/ui/input";
import { saveProductSpecs } from "@/features/admin/catalog-actions";
import type { SpecDefinition } from "@/features/admin/catalog";
import { cn } from "@/lib/utils";

type SpecValue = {
  spec_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
};

function initialValue(definition: SpecDefinition, values: SpecValue[]) {
  const current = values.find((value) => value.spec_id === definition.id);
  if (!current) return "";
  if (definition.data_type === "boolean")
    return current.value_boolean === null ? "" : String(current.value_boolean);
  if (definition.data_type === "number")
    return current.value_number === null ? "" : String(current.value_number);
  return current.value_text ?? "";
}

/** Ficha técnica: un campo por especificación definida en la categoría. */
export function SpecsEditor({
  productId,
  categoryId,
  definitions,
  values,
}: {
  productId: string;
  categoryId: string;
  definitions: SpecDefinition[];
  values: SpecValue[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      definitions.map((definition) => [definition.id, initialValue(definition, values)]),
    ),
  );

  if (!definitions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        La categoría no tiene especificaciones definidas.{" "}
        <Link
          href={`/admin/categorias/${categoryId}`}
          className="font-semibold text-primary hover:underline"
        >
          Defínelas en la categoría
        </Link>
        .
      </p>
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveProductSpecs({
        productId,
        specs: definitions.map((definition) => {
          const value = form[definition.id] ?? "";
          return {
            specId: definition.id,
            // Coma decimal colombiana (1,5) solo en números; el texto se guarda tal cual.
            value: definition.data_type === "number" ? value.replace(",", ".") : value,
          };
        }),
      });
      if (result.ok) {
        toast.success("Ficha técnica guardada");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {definitions.map((definition) => {
          const id = `spec-${definition.id}`;
          const value = form[definition.id] ?? "";
          const set = (next: string) =>
            setForm((current) => ({ ...current, [definition.id]: next }));
          return (
            <div key={definition.id} className="grid gap-1.5">
              <label htmlFor={id} className="text-sm font-semibold">
                {definition.label}
                {definition.unit && (
                  <span className="font-normal text-muted-foreground"> ({definition.unit})</span>
                )}
              </label>
              {definition.data_type === "boolean" ? (
                <select
                  id={id}
                  value={value}
                  onChange={(event) => set(event.target.value)}
                  className={cn(fieldBase, "h-10 px-3")}
                >
                  <option value="">Sin dato</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <Input
                  id={id}
                  value={value}
                  inputMode={definition.data_type === "number" ? "decimal" : undefined}
                  onChange={(event) => set(event.target.value)}
                  maxLength={300}
                />
              )}
            </div>
          );
        })}
      </div>
      <div>
        <Button type="button" onClick={save} isLoading={pending}>
          Guardar ficha técnica
        </Button>
      </div>
    </div>
  );
}
