import type { ProductSpec, SpecDataType } from "./types";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

type RawSpec = {
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
