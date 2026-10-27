import type { CardSpec, ProductSpec, SpecDataType } from "./types";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export type RawSpec = {
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  definition: {
    key: string;
    label: string;
    group_label: string | null;
    unit: string | null;
    data_type: SpecDataType;
    position: number;
    show_on_card?: boolean;
  } | null;
};

/** Texto legible de un valor de especificación: "5,3 GHz", "Sí", "2 TB". */
export function formatSpecValue(
  dataType: SpecDataType,
  value: { text: string | null; number: number | null; boolean: boolean | null },
  unit: string | null,
): string {
  if (dataType === "boolean") return value.boolean ? "Sí" : "No";
  if (dataType === "number" && value.number !== null) {
    if (unit === "GB" && value.number >= 1000) {
      return `${numberFormatter.format(value.number / 1000)} TB`;
    }
    const formatted = numberFormatter.format(value.number);
    return unit ? `${formatted} ${unit}` : formatted;
  }
  return value.text ?? "";
}

/** Normaliza y ordena las especificaciones de un producto según su definición. */
export function toProductSpecs(raw: RawSpec[]): ProductSpec[] {
  return (
    raw
      .filter((spec): spec is RawSpec & { definition: NonNullable<RawSpec["definition"]> } =>
        Boolean(spec.definition),
      )
      // Desempate por clave: el orden debe ser estable aunque dos posiciones coincidan.
      .sort(
        (a, b) =>
          a.definition.position - b.definition.position ||
          a.definition.key.localeCompare(b.definition.key),
      )
      .map((spec) => ({
        key: spec.definition.key,
        label: spec.definition.label,
        group: spec.definition.group_label ?? "General",
        value: formatSpecValue(
          spec.definition.data_type,
          { text: spec.value_text, number: spec.value_number, boolean: spec.value_boolean },
          spec.definition.unit,
        ),
      }))
      .filter((spec) => spec.value !== "")
  );
}

/** Agrupa especificaciones conservando el orden de aparición de cada grupo. */
export function groupSpecs(specs: ProductSpec[]): { group: string; items: ProductSpec[] }[] {
  const groups = new Map<string, ProductSpec[]>();
  for (const spec of specs) {
    groups.set(spec.group, [...(groups.get(spec.group) ?? []), spec]);
  }
  return [...groups].map(([group, items]) => ({ group, items }));
}

/**
 * Especificaciones de la tarjeta de producto, cortas y en el orden de la ficha:
 * «12 GB», «8 núcleos» (número sin unidad + etiqueta) o la etiqueta sola si es
 * un «Sí». Un «No» no aporta en una tarjeta y se omite.
 */
export function toCardSpecs(raw: RawSpec[], limit = 3): CardSpec[] {
  return raw
    .filter((spec): spec is RawSpec & { definition: NonNullable<RawSpec["definition"]> } =>
      Boolean(spec.definition),
    )
    .sort(
      (a, b) =>
        a.definition.position - b.definition.position ||
        a.definition.key.localeCompare(b.definition.key),
    )
    .flatMap(({ definition, value_text, value_number, value_boolean }): CardSpec[] => {
      const { label, unit, data_type } = definition;
      if (data_type === "boolean") return value_boolean ? [{ label, text: label }] : [];
      const value = formatSpecValue(
        data_type,
        { text: value_text, number: value_number, boolean: value_boolean },
        unit,
      );
      if (!value) return [];
      const bare = data_type === "number" && !unit;
      return [{ label, text: bare ? `${value} ${label.toLocaleLowerCase("es-CO")}` : value }];
    })
    .slice(0, limit);
}
