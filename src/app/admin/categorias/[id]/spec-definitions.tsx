"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckboxField, SelectField, TextField } from "@/components/admin/form-helpers";
import { useFocusFirstField } from "@/components/admin/use-focus-first-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSpecDefinition, saveSpecDefinition } from "@/features/admin/catalog-actions";
import type { SpecDefinition } from "@/features/admin/catalog";
import { slugify } from "@/lib/format";

type Errors = Partial<Record<string, string[]>>;
type Draft = {
  id?: string;
  key: string;
  label: string;
  groupLabel: string;
  unit: string;
  dataType: "text" | "number" | "boolean";
  isFilterable: boolean;
  showOnCard: boolean;
  position: string;
};

/** Cuántas especificaciones puede mostrar la tarjeta de producto (igual que en la base). */
const CARD_LIMIT = 3;

const TYPE_LABELS = { text: "Texto", number: "Número", boolean: "Sí / No" } as const;

const toKey = (label: string) =>
  slugify(label)
    .replace(/-/g, "_")
    .replace(/^[^a-z]+/, "")
    .slice(0, 50);

/** Especificaciones que se piden en la ficha técnica de los productos de la categoría. */
export function SpecDefinitions({
  categoryId,
  definitions,
  architectKeys = [],
}: {
  categoryId: string;
  definitions: SpecDefinition[];
  /** Claves que usa el motor de compatibilidad para la pieza de esta categoría. */
  architectKeys?: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstField(formRef, draft ? (draft.id ?? "nueva") : null);

  const startNew = () => {
    setErrors({});
    setDraft({
      key: "",
      label: "",
      groupLabel: "",
      unit: "",
      dataType: "text",
      isFilterable: false,
      showOnCard: false,
      position: String(definitions.length + 1),
    });
  };

  const startEdit = (definition: SpecDefinition) => {
    setErrors({});
    setDraft({
      id: definition.id,
      key: definition.key,
      label: definition.label,
      groupLabel: definition.group_label ?? "",
      unit: definition.unit ?? "",
      dataType: definition.data_type,
      isFilterable: definition.is_filterable,
      showOnCard: definition.show_on_card,
      position: String(definition.position),
    });
  };

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const result = await saveSpecDefinition({ ...draft, categoryId });
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success("Especificación guardada");
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteSpecDefinition({ id });
      if (result.ok) {
        toast.success("Especificación eliminada");
        router.refresh();
      } else toast.error(result.error.message);
      setDeleting(null);
    });
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
            ...(key === "label" && !current.id ? { key: toKey(String(value)) } : {}),
          }
        : current,
    );

  // Las marcadas en las demás especificaciones (la que se edita se cuenta según la casilla).
  const onCard =
    definitions.filter((definition) => definition.show_on_card && definition.id !== draft?.id)
      .length + (draft?.showOnCard ? 1 : 0);

  return (
    <div className="grid gap-4">
      {definitions.length ? (
        <ul className="grid divide-y rounded-lg border">
          {definitions.map((definition) => (
            <li key={definition.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="grid min-w-40 flex-1 gap-0.5">
                <span className="font-medium">
                  {definition.label}
                  {definition.unit && (
                    <span className="text-muted-foreground"> ({definition.unit})</span>
                  )}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {definition.key} · {definition.group_label ?? "General"}
                </span>
              </div>
              <Badge variant="outline">{TYPE_LABELS[definition.data_type]}</Badge>
              {architectKeys.includes(definition.key) && (
                <Badge
                  variant="outline"
                  className="border-tech/50 text-tech"
                  title="La usa Kova Architect para comprobar la compatibilidad"
                >
                  Architect
                </Badge>
              )}
              {definition.show_on_card && <Badge variant="soft">En la tarjeta</Badge>}
              {definition.is_filterable && <Badge variant="soft">Filtrable</Badge>}
              {deleting === definition.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive">¿Borrar también sus valores?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    isLoading={pending}
                    onClick={() => remove(definition.id)}
                  >
                    Borrar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>
                    No
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => startEdit(definition)}
                    aria-label={`Editar ${definition.label}`}
                  >
                    <PencilIcon aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setDeleting(definition.id)}
                    aria-label={`Eliminar ${definition.label}`}
                  >
                    <Trash2Icon className="text-destructive" aria-hidden />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aún no hay especificaciones para esta categoría.
        </p>
      )}

      {draft ? (
        <form
          ref={formRef}
          onSubmit={save}
          noValidate
          className="grid gap-4 rounded-lg border bg-secondary/40 p-4"
        >
          <p className="font-semibold">
            {draft.id ? "Editar especificación" : "Nueva especificación"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="label"
              label="Etiqueta"
              errors={errors}
              value={draft.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Memoria de video"
            />
            <TextField
              name="key"
              label="Clave interna"
              errors={errors}
              value={draft.key}
              onChange={(e) => set("key", e.target.value)}
              hint="Identificador técnico, ej. vram. No la cambies si ya tiene valores."
              className="[&_input]:font-mono"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <SelectField
              name="dataType"
              label="Tipo"
              errors={errors}
              value={draft.dataType}
              onChange={(e) => set("dataType", e.target.value as Draft["dataType"])}
              options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <TextField
              name="unit"
              label="Unidad"
              optional
              errors={errors}
              value={draft.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="GB, W, MHz"
            />
            <TextField
              name="groupLabel"
              label="Grupo"
              optional
              errors={errors}
              value={draft.groupLabel}
              onChange={(e) => set("groupLabel", e.target.value)}
              placeholder="Memoria"
            />
            <TextField
              name="position"
              label="Orden"
              errors={errors}
              inputMode="numeric"
              value={draft.position}
              onChange={(e) => set("position", e.target.value)}
            />
          </div>
          <CheckboxField
            name="showOnCard"
            label="Mostrar en la tarjeta"
            hint={`Aparece en las tarjetas de producto del catálogo (hasta ${CARD_LIMIT} por categoría, en el orden de la ficha). Usadas: ${onCard}/${CARD_LIMIT}.`}
            errors={errors}
            checked={draft.showOnCard}
            disabled={!draft.showOnCard && onCard >= CARD_LIMIT}
            onCheckedChange={(checked) => set("showOnCard", checked)}
          />
          <CheckboxField
            name="isFilterable"
            label="Filtrable"
            hint="Reservado para filtros por especificación en el catálogo."
            checked={draft.isFilterable}
            onCheckedChange={(checked) => set("isFilterable", checked)}
          />
          <div className="flex gap-2">
            <Button type="submit" isLoading={pending}>
              Guardar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button type="button" variant="secondary" onClick={startNew}>
            <PlusIcon aria-hidden />
            Agregar especificación
          </Button>
        </div>
      )}
    </div>
  );
}
