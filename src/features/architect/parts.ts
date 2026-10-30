import { formatSpecValue, toCardSpecs, type RawSpec } from "@/features/catalog/specs";
import { ARCHITECT_TEMPLATES } from "@/features/compatibility/template";
import type { PartKind, PartSpecs } from "@/features/compatibility/types";
import { DEMO_PARTS } from "./demo-parts";
import type { ArchitectPart, PartDetail } from "./types";

type DefinedSpec = RawSpec & { definition: NonNullable<RawSpec["definition"]> };

/** Valores crudos por clave (para el motor), ficha legible y especificaciones cortas. */
export function describeSpecs(raw: RawSpec[]): {
  specs: PartSpecs;
  details: PartDetail[];
  keySpecs: ArchitectPart["keySpecs"];
} {
  const defined = raw
    .filter((spec): spec is DefinedSpec => Boolean(spec.definition))
    .sort(
      (a, b) =>
        a.definition.position - b.definition.position ||
        a.definition.key.localeCompare(b.definition.key),
    );
  const specs: PartSpecs = {};
  const details: PartDetail[] = [];
  for (const spec of defined) {
    const { key, label, unit, data_type } = spec.definition;
    specs[key] = spec.value_number ?? spec.value_text ?? spec.value_boolean;
    const value = formatSpecValue(
      data_type,
      { text: spec.value_text, number: spec.value_number, boolean: spec.value_boolean },
      unit,
    );
    if (value) details.push({ key, label, value, number: spec.value_number, unit });
  }
  const onCard = defined.filter((spec) => spec.definition.show_on_card);
  // Sin especificaciones marcadas para la tarjeta, las primeras de la ficha.
  return { specs, details, keySpecs: toCardSpecs(onCard.length ? onCard : defined) };
}

/** Ficha de una pieza demo armada con las etiquetas y unidades de la plantilla. */
function demoRawSpecs(kind: PartKind, specs: PartSpecs): RawSpec[] {
  return ARCHITECT_TEMPLATES[kind].flatMap((template, position): RawSpec[] => {
    const value = specs[template.key];
    if (value === undefined || value === null) return [];
    return [
      {
        value_text: typeof value === "string" ? value : null,
        value_number: typeof value === "number" ? value : null,
        value_boolean: typeof value === "boolean" ? value : null,
        definition: {
          key: template.key,
          label: template.label,
          group_label: template.groupLabel,
          unit: template.unit,
          data_type: template.dataType,
          position,
        },
      },
    ];
  });
}

/** Las piezas demo en el mismo formato que las del catálogo. */
export function demoArchitectParts(): ArchitectPart[] {
  return DEMO_PARTS.map((part) => ({
    id: part.id,
    kind: part.kind,
    name: part.name,
    brand: null,
    price: part.price,
    stock: null,
    lowStockThreshold: 0,
    slug: null,
    image: null,
    demo: true,
    reference: false,
    offers: [],
    ...describeSpecs(demoRawSpecs(part.kind, part.specs)),
  }));
}
