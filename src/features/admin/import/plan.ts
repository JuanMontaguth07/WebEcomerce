import { slugify } from "@/lib/format";
import { productSchema, type ProductValues } from "../catalog-schemas";
import {
  normalizeName,
  PRODUCT_COLUMNS,
  PRODUCT_TYPE_LABELS,
  type ProductTypeKey,
} from "./columns";
import { parseDecimal, parseMoney, parseYesNo, type RawProductRow } from "./parse";

export type SpecDefinition = {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  dataType: "text" | "number" | "boolean";
};

export type ExistingProduct = {
  id: string;
  values: ProductValues;
  stock: number;
  /** Valor de cada especificación como texto («8», «AM5», «true»). */
  specs: Record<string, string>;
};

/** Lo que la importación necesita saber de la tienda (lo carga el servidor). */
export type ImportContext = {
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
  products: ExistingProduct[];
  specs: SpecDefinition[];
};

export type ImportAction = "create" | "update" | "unchanged" | "error";

export type PlannedRow = {
  line: number;
  sku: string;
  name: string;
  action: ImportAction;
  productId: string | null;
  values: ProductValues | null;
  /** Unidades a sumar (o restar) para llegar al stock del archivo. */
  stockDelta: number;
  /** Ficha técnica completa a guardar; null = no se toca. */
  specs: { specId: string; value: string }[] | null;
  /** Qué cambia, en palabras («Precio», «Stock 3 → 5»). */
  changes: string[];
  /** Cambia algún dato del producto (no solo stock o ficha). */
  fieldsChanged: boolean;
  errors: string[];
  warnings: string[];
};

const LABEL: Record<string, string> = {
  ...Object.fromEntries(PRODUCT_COLUMNS.map((column) => [column.field, column.header])),
  categoryId: "Categoría",
  brandId: "Marca",
};

// Campos que el archivo puede cambiar (rareza, etiqueta y nota única se conservan).
const COMPARED: (keyof ProductValues)[] = [
  "name",
  "slug",
  "productType",
  "categoryId",
  "brandId",
  "price",
  "compareAtPrice",
  "lowStockThreshold",
  "warrantyMonths",
  "isActive",
  "isFeatured",
  "isReference",
  "shortDescription",
  "description",
  "seoTitle",
  "seoDescription",
];

const NO_BRAND = new Set(["ninguna", "sin marca", "no", "ninguno"]);

function productTypeFrom(value: string): ProductTypeKey | null {
  const wanted = normalizeName(value);
  const aliases: Record<string, ProductTypeKey> = {
    componente: "component",
    component: "component",
    pieza: "component",
    "computador armado": "prebuilt",
    "pc armado": "prebuilt",
    armado: "prebuilt",
    prebuilt: "prebuilt",
    periferico: "peripheral",
    peripheral: "peripheral",
  };
  if (aliases[wanted]) return aliases[wanted];
  const match = Object.entries(PRODUCT_TYPE_LABELS).find(
    ([, label]) => normalizeName(label) === wanted,
  );
  return (match?.[0] as ProductTypeKey | undefined) ?? null;
}

/** Entero de 0 en adelante, o null si el texto no lo es. */
function wholeNumber(value: string): number | null {
  const number = parseDecimal(value);
  return number !== null && Number.isInteger(number) && number >= 0 ? number : null;
}

/** El valor de una especificación tal como lo guarda la base, o el problema. */
function specValue(spec: SpecDefinition, raw: string): { value: string } | { error: string } {
  if (spec.dataType === "number") {
    const number = parseDecimal(raw);
    return number === null ? { error: `«${raw}» no es un número.` } : { value: String(number) };
  }
  if (spec.dataType === "boolean") {
    const yes = parseYesNo(raw);
    return yes === null ? { error: "usa Sí o No." } : { value: String(yes) };
  }
  return raw.length > 300 ? { error: "máximo 300 caracteres." } : { value: raw };
}

function uniqueSlug(base: string, used: Set<string>): string {
  const root = base || "producto";
  let candidate = root;
  for (let suffix = 2; used.has(candidate); suffix += 1) candidate = `${root}-${suffix}`;
  return candidate;
}

const DEFAULTS = {
  productType: "component",
  brandId: null,
  rarityId: null,
  flagId: null,
  uniqueNote: null,
  compareAtPrice: null,
  lowStockThreshold: 3,
  warrantyMonths: null,
  shortDescription: null,
  description: null,
  // Lo nuevo entra oculto salvo que el archivo diga lo contrario: así no se
  // publica nada sin fotos por accidente.
  isActive: false,
  isFeatured: false,
  isReference: false,
  seoTitle: null,
  seoDescription: null,
} satisfies Partial<ProductValues>;

/**
 * Decide qué hacer con cada fila: crear (SKU nuevo), actualizar (SKU existente,
 * solo lo que trae la fila: una celda vacía no borra nada), dejar igual o
 * marcar el error. Valida con las mismas reglas del formulario de producto.
 */
export function planImport(rows: RawProductRow[], context: ImportContext): PlannedRow[] {
  const bySku = new Map(context.products.map((product) => [product.values.sku, product]));
  const usedSlugs = new Set(context.products.map((product) => product.values.slug));
  const firstLine = new Map<string, number>();
  const named = <T extends { name: string; slug: string }>(list: T[], value: string) =>
    list.find(
      (item) =>
        normalizeName(item.name) === normalizeName(value) ||
        item.slug === value.trim().toLowerCase(),
    );

  return rows.map((row) => {
    const fields = row.fields;
    const errors: string[] = [];
    const warnings: string[] = [];
    const sku = (fields.sku ?? "").trim().toUpperCase();
    const fail = (message?: string): PlannedRow => ({
      line: row.line,
      sku,
      name: fields.name ?? "",
      action: "error",
      productId: null,
      values: null,
      stockDelta: 0,
      specs: null,
      changes: [],
      fieldsChanged: false,
      errors: message ? [message] : errors,
      warnings,
    });

    if (!sku) return fail("Falta el SKU: es lo que identifica cada producto.");
    const repeated = firstLine.get(sku);
    if (repeated) return fail(`El SKU se repite en el archivo (ya está en la línea ${repeated}).`);
    firstLine.set(sku, row.line);

    const existing = bySku.get(sku);
    const draft: Record<string, unknown> = existing ? { ...existing.values } : { ...DEFAULTS, sku };

    if (fields.name) draft.name = fields.name;
    if (fields.productType) {
      const type = productTypeFrom(fields.productType);
      if (type) draft.productType = type;
      else {
        errors.push(
          `Tipo: «${fields.productType}» no es válido (Componente, Computador armado o Periférico).`,
        );
      }
    }
    if (fields.category) {
      const category = named(context.categories, fields.category);
      if (category) draft.categoryId = category.id;
      else errors.push(`Categoría: no existe «${fields.category}». Créala primero en Categorías.`);
    } else if (!existing) {
      errors.push("Categoría: es obligatoria para un producto nuevo.");
    }
    if (fields.brand) {
      if (NO_BRAND.has(normalizeName(fields.brand))) draft.brandId = null;
      else {
        const brand = named(context.brands, fields.brand);
        if (brand) draft.brandId = brand.id;
        else errors.push(`Marca: no existe «${fields.brand}». Créala primero en Marcas.`);
      }
    }
    for (const field of ["price", "compareAtPrice"] as const) {
      const raw = fields[field];
      if (!raw) continue;
      const amount = parseMoney(raw);
      if (amount === null) errors.push(`${LABEL[field]}: «${raw}» no es un valor en pesos.`);
      else draft[field] = amount;
    }
    for (const field of ["lowStockThreshold", "warrantyMonths"] as const) {
      const raw = fields[field];
      if (!raw) continue;
      const number = wholeNumber(raw);
      if (number === null) errors.push(`${LABEL[field]}: «${raw}» debe ser un número entero.`);
      else draft[field] = number;
    }
    for (const field of ["isActive", "isFeatured", "isReference"] as const) {
      const raw = fields[field];
      if (!raw) continue;
      const yes = parseYesNo(raw);
      if (yes === null) errors.push(`${LABEL[field]}: «${raw}» no se entiende; usa Sí o No.`);
      else draft[field] = yes;
    }
    for (const field of [
      "shortDescription",
      "description",
      "seoTitle",
      "seoDescription",
    ] as const) {
      if (fields[field]) draft[field] = fields[field];
    }

    // Una pieza de referencia nunca está visible: si el archivo no dice nada, se oculta sola.
    if (draft.isReference === true && !fields.isActive) draft.isActive = false;

    // El slug: el del archivo, o uno a partir del nombre para lo nuevo.
    if (fields.slug) {
      const slug = fields.slug.trim().toLowerCase();
      if (slug !== existing?.values.slug && usedSlugs.has(slug)) {
        errors.push(`Slug: «${slug}» ya lo usa otro producto.`);
      }
      draft.slug = slug;
    } else if (!existing && typeof draft.name === "string") {
      draft.slug = uniqueSlug(slugify(draft.name), usedSlugs);
    }

    const parsed = productSchema.safeParse(draft);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        const label = LABEL[key] ?? key;
        // Si el campo ya tiene su error (p. ej. «cien» no es un precio), no se repite.
        if (errors.some((error) => error.startsWith(`${label}:`))) continue;
        errors.push(`${label}: ${issue.message}`);
      }
    }

    let stockDelta = 0;
    if (fields.stock) {
      const stock = wholeNumber(fields.stock);
      if (stock === null)
        errors.push(`Stock: «${fields.stock}» debe ser un entero de 0 en adelante.`);
      else stockDelta = stock - (existing?.stock ?? 0);
    }

    if (errors.length || !parsed.success) return fail();
    const values = parsed.data;
    usedSlugs.add(values.slug);

    // Ficha técnica: lo que ya tenía (si sigue en la misma categoría) más lo del archivo.
    const categorySpecs = context.specs.filter((spec) => spec.categoryId === values.categoryId);
    const merged = new Map<string, string>();
    const sameCategory = existing?.values.categoryId === values.categoryId;
    if (existing && sameCategory) {
      for (const [specId, value] of Object.entries(existing.specs)) merged.set(specId, value);
    }
    let specsChanged = Boolean(existing && !sameCategory && Object.keys(existing.specs).length);
    for (const [name, raw] of Object.entries(row.specs)) {
      const spec = categorySpecs.find(
        (item) =>
          normalizeName(item.label) === normalizeName(name) ||
          item.key === name.trim().toLowerCase(),
      );
      if (!spec) {
        warnings.push(`Ficha «${name}»: su categoría no tiene ese dato; se ignora.`);
        continue;
      }
      const result = specValue(spec, raw);
      if ("error" in result) {
        errors.push(`Ficha «${spec.label}»: ${result.error}`);
        continue;
      }
      if (merged.get(spec.id) !== result.value) {
        merged.set(spec.id, result.value);
        specsChanged = true;
      }
    }
    if (errors.length) return fail();

    const changes: string[] = [];
    const changedFields = existing
      ? COMPARED.filter((field) => values[field] !== existing.values[field])
      : [];
    if (existing) {
      changes.push(...changedFields.map((field) => LABEL[field] ?? field));
      if (stockDelta) changes.push(`Stock ${existing.stock} → ${existing.stock + stockDelta}`);
      if (specsChanged) changes.push("Ficha técnica");
    } else if (!fields.isActive && !values.isReference) {
      warnings.push("Se crea oculto: pon «Sí» en Visible para publicarlo.");
    }

    return {
      line: row.line,
      sku,
      name: values.name,
      action: !existing ? "create" : changes.length ? "update" : "unchanged",
      productId: existing?.id ?? null,
      values,
      stockDelta,
      specs:
        specsChanged || (!existing && merged.size)
          ? [...merged].map(([specId, value]) => ({ specId, value }))
          : null,
      changes,
      fieldsChanged: changedFields.length > 0,
      errors: [],
      warnings,
    };
  });
}

/** Cuántas filas hay de cada tipo. */
export function summarize(plan: PlannedRow[]): Record<ImportAction, number> {
  const counts: Record<ImportAction, number> = { create: 0, update: 0, unchanged: 0, error: 0 };
  for (const row of plan) counts[row.action] += 1;
  return counts;
}
