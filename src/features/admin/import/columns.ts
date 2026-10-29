/**
 * Columnas del CSV de productos. Las mismas sirven para exportar, para la
 * plantilla y para importar: se puede exportar, editar en Excel y volver a
 * subir. Al importar se reconocen sin importar mayúsculas ni tildes, y algunos
 * nombres alternativos («Nombre», «Código»…).
 */

export const PRODUCT_COLUMNS = [
  { field: "sku", header: "SKU", aliases: ["codigo", "referencia", "ref"] },
  { field: "name", header: "Producto", aliases: ["nombre", "nombre del producto"] },
  { field: "slug", header: "Slug", aliases: ["url"] },
  { field: "productType", header: "Tipo", aliases: ["tipo de producto"] },
  { field: "category", header: "Categoría", aliases: [] },
  { field: "brand", header: "Marca", aliases: ["fabricante"] },
  { field: "price", header: "Precio", aliases: ["precio de venta", "valor"] },
  {
    field: "compareAtPrice",
    header: "Precio anterior",
    aliases: ["precio antes", "precio tachado", "precio de lista"],
  },
  {
    field: "stock",
    header: "Stock",
    aliases: ["existencias", "unidades", "cantidad", "inventario"],
  },
  {
    field: "lowStockThreshold",
    header: "Aviso de stock bajo",
    aliases: ["stock minimo", "minimo"],
  },
  {
    field: "warrantyMonths",
    header: "Garantía (meses)",
    aliases: ["garantia", "meses de garantia"],
  },
  { field: "isActive", header: "Visible", aliases: ["activo", "publicado"] },
  { field: "isFeatured", header: "Destacado", aliases: [] },
  { field: "shortDescription", header: "Descripción corta", aliases: ["resumen"] },
  { field: "description", header: "Descripción", aliases: ["descripcion larga", "detalle"] },
  { field: "seoTitle", header: "Título SEO", aliases: ["titulo seo"] },
  { field: "seoDescription", header: "Descripción SEO", aliases: ["meta descripcion"] },
] as const;

export type ProductField = (typeof PRODUCT_COLUMNS)[number]["field"];

/** Columnas de la ficha técnica: «Ficha: Núcleos», «Ficha: Socket»… */
export const SPEC_PREFIX = "Ficha: ";

/** Columnas que el export agrega como referencia y que la importación ignora. */
export const READ_ONLY_HEADERS = ["Valor del inventario", "Actualizado"] as const;

export const PRODUCT_TYPE_LABELS = {
  component: "Componente",
  prebuilt: "Computador armado",
  peripheral: "Periférico",
} as const;

export type ProductTypeKey = keyof typeof PRODUCT_TYPE_LABELS;

/** Sin tildes, sin mayúsculas, sin signos y con espacios simples: para comparar nombres. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const BY_NAME = new Map<string, ProductField>(
  PRODUCT_COLUMNS.flatMap((column) =>
    [column.header, ...column.aliases].map((name) => [normalizeName(name), column.field] as const),
  ),
);
// «Garantía (meses)» también como «Garantía meses».
BY_NAME.set("garantia meses", "warrantyMonths");

/** Qué es cada encabezado: un campo, una especificación de la ficha o nada conocido. */
export function classifyHeader(
  header: string,
):
  | { kind: "field"; field: ProductField }
  | { kind: "spec"; name: string }
  | { kind: "ignored" }
  | { kind: "unknown" } {
  const clean = header.trim();
  const spec = /^ficha\s*[:·-]\s*(.+)$/i.exec(clean);
  if (spec?.[1]) return { kind: "spec", name: spec[1].trim() };
  const normalized = normalizeName(clean);
  if (!normalized) return { kind: "ignored" };
  const field = BY_NAME.get(normalized);
  if (field) return { kind: "field", field };
  if (READ_ONLY_HEADERS.some((name) => normalizeName(name) === normalized)) {
    return { kind: "ignored" };
  }
  return { kind: "unknown" };
}
