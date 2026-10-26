import { MOVEMENT_LABELS } from "@/features/inventory/schemas";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/features/orders/transitions";
import { formatCOP } from "@/lib/format";

/**
 * Presentación del historial general (tabla audit_log). Funciones puras: la
 * base guarda datos estructurados y aquí se convierten en frases legibles.
 */

export const ACTIVITY_ENTITIES = [
  "product",
  "product_image",
  "product_specs",
  "category",
  "spec_definition",
  "brand",
  "order",
  "inventory",
  "shipping_rate",
  "store_settings",
] as const;

export type ActivityEntity = (typeof ACTIVITY_ENTITIES)[number];
export type ActivityAction = "create" | "update" | "delete";

export type ActivityEntry = {
  id: number;
  occurredAt: string;
  actorId: string | null;
  actorLabel: string | null;
  entity: ActivityEntity;
  action: ActivityAction;
  entityId: string | null;
  entityLabel: string | null;
  changes: Record<string, unknown> | null;
  reason: string | null;
};

/** Grupos del filtro de la página de actividad. */
export const ACTIVITY_GROUPS = {
  productos: { label: "Productos", entities: ["product", "product_image", "product_specs"] },
  pedidos: { label: "Pedidos", entities: ["order"] },
  inventario: { label: "Inventario", entities: ["inventory"] },
  catalogo: { label: "Categorías y marcas", entities: ["category", "spec_definition", "brand"] },
  envios: { label: "Envíos", entities: ["shipping_rate"] },
  configuracion: { label: "Configuración", entities: ["store_settings"] },
} as const satisfies Record<string, { label: string; entities: readonly ActivityEntity[] }>;

export type ActivityGroup = keyof typeof ACTIVITY_GROUPS;

export const ACTION_LABELS: Record<ActivityAction, string> = {
  create: "Creaciones",
  update: "Ediciones",
  delete: "Eliminaciones",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  slug: "Dirección (slug)",
  sku: "SKU",
  product_type: "Tipo",
  short_description: "Resumen",
  description: "Descripción",
  price: "Precio",
  compare_at_price: "Precio anterior",
  brand_id: "Marca",
  category_id: "Categoría",
  parent_id: "Categoría principal",
  low_stock_threshold: "Aviso de stock bajo",
  warranty_months: "Garantía (meses)",
  is_active: "Visible",
  is_featured: "Destacado",
  is_filterable: "Filtrable",
  seo_title: "Título SEO",
  seo_description: "Descripción SEO",
  position: "Orden",
  image_path: "Imagen",
  logo_path: "Logo",
  storage_path: "Archivo",
  alt_text: "Texto alternativo",
  key: "Clave",
  label: "Etiqueta",
  group_label: "Grupo",
  unit: "Unidad",
  data_type: "Tipo de dato",
  department: "Departamento",
  city: "Ciudad",
  min_days: "Días mínimos",
  max_days: "Días máximos",
  whatsapp_number: "WhatsApp",
  support_email: "Correo de soporte",
  support_hours: "Horario",
  legal_name: "Nombre legal",
  legal_nit: "NIT / cédula",
  legal_dv: "DV",
  legal_address: "Dirección legal",
  legal_city: "Ciudad legal",
  nequi_number: "Número Nequi",
  nequi_holder: "Titular Nequi",
  status: "Estado",
  shipping_cost: "Envío",
  total: "Total",
  customer_name: "Cliente",
  movement_type: "Tipo de movimiento",
  quantity: "Cantidad",
  previous_stock: "Stock anterior",
  resulting_stock: "Stock resultante",
};

const MONEY_FIELDS = new Set(["price", "compare_at_price", "shipping_cost", "total"]);
const REFERENCE_FIELDS = new Set(["brand_id", "category_id", "parent_id"]);
const PRODUCT_TYPES: Record<string, string> = {
  component: "Componente",
  prebuilt: "Computador armado",
  peripheral: "Periférico",
};
const DATA_TYPES: Record<string, string> = { text: "Texto", number: "Número", boolean: "Sí / No" };
const LONG_TEXT = 140;

/** Nombre de quien hizo el cambio. Sin usuario: el cliente (pedidos) o un proceso automático. */
export function actorName(entry: Pick<ActivityEntry, "actorLabel" | "entity" | "action">): string {
  if (entry.actorLabel) return entry.actorLabel;
  return entry.entity === "order" && entry.action === "create" ? "Cliente" : "Sistema";
}

type Change = { old: unknown; new: unknown };

function isChange(value: unknown): value is Change {
  return typeof value === "object" && value !== null && "old" in value && "new" in value;
}

function quoted(label: string | null) {
  return label ? `«${label}»` : "";
}

/** Frase principal sin el sujeto: «eliminó el producto «RTX 4060»». */
export function describeActivity(entry: ActivityEntry): string {
  const label = quoted(entry.entityLabel);
  const changes = entry.changes ?? {};

  switch (entry.entity) {
    case "product": {
      if (entry.action === "update") {
        const keys = Object.keys(changes);
        const visibility = changes.is_active;
        if (keys.length === 1 && isChange(visibility)) {
          return visibility.new ? `publicó ${label} en la tienda` : `ocultó ${label} de la tienda`;
        }
        const price = changes.price;
        if (keys.length === 1 && isChange(price)) {
          return `cambió el precio de ${label} a ${formatCOP(Number(price.new))}`;
        }
      }
      return `${verb(entry.action)} el producto ${label}`;
    }
    case "product_image":
      return {
        create: `agregó una imagen a ${label}`,
        update: `editó el texto de una imagen de ${label}`,
        delete: `quitó una imagen de ${label}`,
      }[entry.action];
    case "product_specs":
      return `actualizó la ficha técnica de ${label}`;
    case "category":
      return `${verb(entry.action)} la categoría ${label}`;
    case "spec_definition":
      return {
        create: `agregó la especificación ${label}`,
        update: `editó la especificación ${label}`,
        delete: `quitó la especificación ${label}`,
      }[entry.action];
    case "brand":
      return `${verb(entry.action)} la marca ${label}`;
    case "order": {
      const number = entry.entityLabel ?? "";
      if (entry.action === "create") return `hizo el pedido ${number}`;
      const status = changes.status;
      if (isChange(status)) {
        const target = ORDER_STATUS_LABELS[status.new as OrderStatus] ?? String(status.new);
        return `cambió el pedido ${number} a ${target.toLowerCase()}`;
      }
      const shipping = changes.shipping_cost;
      if (isChange(shipping)) {
        return `fijó el envío del pedido ${number} en ${formatCOP(Number(shipping.new))}`;
      }
      return `editó el pedido ${number}`;
    }
    case "inventory": {
      const type = MOVEMENT_LABELS[changes.movement_type as keyof typeof MOVEMENT_LABELS];
      const quantity = Number(changes.quantity);
      const signed = Number.isFinite(quantity) ? `${quantity > 0 ? "+" : ""}${quantity}` : "";
      return `registró ${type ? type.toLowerCase() : "un movimiento"} (${signed}) en ${label}`;
    }
    case "shipping_rate":
      return `${verb(entry.action)} la tarifa de envío ${label}`;
    case "store_settings":
      return "actualizó la configuración de la tienda";
  }
}

function verb(action: ActivityAction) {
  return { create: "creó", update: "editó", delete: "eliminó" }[action];
}

/** Nombres actuales de categorías y marcas para mostrar referencias por id. */
export type ReferenceNames = Map<string, string>;

export function formatValue(field: string, value: unknown, names?: ReferenceNames): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (MONEY_FIELDS.has(field) && Number.isFinite(Number(value))) return formatCOP(Number(value));
  if (REFERENCE_FIELDS.has(field) && typeof value === "string") {
    return names?.get(value) ?? "(eliminada)";
  }
  if (field === "status") return ORDER_STATUS_LABELS[value as OrderStatus] ?? String(value);
  if (field === "movement_type") {
    return MOVEMENT_LABELS[value as keyof typeof MOVEMENT_LABELS] ?? String(value);
  }
  if (field === "product_type") return PRODUCT_TYPES[String(value)] ?? String(value);
  if (field === "data_type") return DATA_TYPES[String(value)] ?? String(value);
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > LONG_TEXT
    ? `${text.slice(0, LONG_TEXT).trimEnd()}… (${text.length} caracteres)`
    : text;
}

export type ChangeRow = { field: string; label: string; before?: string; after: string };

/**
 * Filas de detalle: en ediciones, antes → después; en creaciones y
 * eliminaciones, la copia de los datos que tenía el registro.
 */
export function changeRows(entry: ActivityEntry, names?: ReferenceNames): ChangeRow[] {
  const changes = entry.changes ?? {};
  const labelFor = (field: string) =>
    // Las claves de la ficha técnica ya son etiquetas legibles («Capacidad (GB)»).
    entry.entity === "product_specs" ? field : (FIELD_LABELS[field] ?? field);

  return Object.entries(changes)
    .map(([field, value]): ChangeRow => {
      if (entry.action === "update" && isChange(value)) {
        return {
          field,
          label: labelFor(field),
          before: formatValue(field, value.old, names),
          after: formatValue(field, value.new, names),
        };
      }
      return { field, label: labelFor(field), after: formatValue(field, value, names) };
    })
    .sort((a, b) => fieldOrder(a.field) - fieldOrder(b.field));
}

const ORDERED_FIELDS = Object.keys(FIELD_LABELS);

function fieldOrder(field: string) {
  const index = ORDERED_FIELDS.indexOf(field);
  return index === -1 ? ORDERED_FIELDS.length : index;
}

/** Ids de categorías y marcas citados en los cambios, para resolver sus nombres. */
export function referencedIds(entries: ActivityEntry[]): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    for (const [field, value] of Object.entries(entry.changes ?? {})) {
      if (!REFERENCE_FIELDS.has(field)) continue;
      const values = isChange(value) ? [value.old, value.new] : [value];
      for (const id of values) if (typeof id === "string") ids.add(id);
    }
  }
  return [...ids];
}

/** Ruta del panel del objeto afectado, o null si ya no existe o no tiene página. */
export function activityHref(entry: ActivityEntry, existing: Set<string>): string | null {
  if (entry.entity === "store_settings") return "/admin/configuracion";
  if (entry.entity === "shipping_rate") return "/admin/envios";
  const id = entry.entityId;
  if (!id || !existing.has(id)) return null;
  switch (entry.entity) {
    case "product":
    case "product_image":
    case "product_specs":
      return `/admin/productos/${id}`;
    case "inventory":
      return `/admin/productos/${id}#inventario`;
    case "category":
    case "spec_definition":
      return `/admin/categorias/${id}`;
    case "brand":
      return `/admin/marcas/${id}`;
    case "order":
      return `/admin/pedidos/${id}`;
  }
}
