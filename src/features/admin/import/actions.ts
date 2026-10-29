"use server";

import { z } from "zod";
import { revalidateCatalog } from "@/features/catalog/revalidate";
import { adminAction } from "@/lib/admin-action";
import { toAppError } from "@/lib/errors";
import { toProductRow } from "../product-row";
import { loadImportContext } from "./context";
import { APPLY_CHUNK, MAX_IMPORT_ROWS } from "./parse";
import { planImport, type ImportAction, type PlannedRow } from "./plan";

/** Las filas como las lee el navegador; el servidor vuelve a validar todo. */
const rowsSchema = z
  .array(
    z.object({
      line: z.number().int().min(1),
      fields: z.record(z.string(), z.string().max(20_000)),
      specs: z.record(z.string().max(120), z.string().max(1_000)),
    }),
  )
  .min(1, "El archivo no tiene filas.")
  .max(MAX_IMPORT_ROWS, `Máximo ${MAX_IMPORT_ROWS} productos por archivo.`);

export type PreviewRow = Pick<
  PlannedRow,
  "line" | "sku" | "name" | "action" | "changes" | "errors" | "warnings"
>;

const toPreview = ({ line, sku, name, action, changes, errors, warnings }: PlannedRow) => ({
  line,
  sku,
  name,
  action,
  changes,
  errors,
  warnings,
});

/** Qué pasaría con cada fila, sin cambiar nada. */
export const previewProductImport = adminAction(
  z.object({ rows: rowsSchema }),
  async ({ rows }, { supabase }) => {
    const plan = planImport(rows, await loadImportContext(supabase));
    return { rows: plan.map(toPreview) };
  },
);

export type AppliedRow = {
  line: number;
  sku: string;
  action: ImportAction;
  ok: boolean;
  message?: string;
};

function rowError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const text = (error as { message?: string })?.message ?? "";
  if (code === "23505" && text.includes("products_sku_key"))
    return "Ya existe un producto con este SKU.";
  if (code === "23505" && text.includes("products_slug_key"))
    return "Ya existe un producto con este slug.";
  if (code === "22P02") return "Un valor numérico de la ficha técnica no es válido.";
  return toAppError(error).message;
}

/**
 * Aplica una tanda: vuelve a planear contra la base (no se confía en la vista
 * previa) y aplica cada fila por separado; si una falla, las demás siguen.
 * Los cambios quedan en el historial (los registran los triggers de la base).
 */
export const applyProductImport = adminAction(
  z.object({ rows: rowsSchema.max(APPLY_CHUNK) }),
  async ({ rows }, { supabase }) => {
    const context = await loadImportContext(supabase);
    const plan = planImport(rows, context);
    const previousSlugs = new Map(
      context.products.map((product) => [product.id, product.values.slug]),
    );
    const touched = new Set<string>();
    const results: AppliedRow[] = [];

    for (const row of plan) {
      const base = { line: row.line, sku: row.sku, action: row.action };
      if (row.action === "error" || row.action === "unchanged" || !row.values) {
        results.push({ ...base, ok: row.action === "unchanged", message: row.errors[0] });
        continue;
      }
      try {
        let id = row.productId;
        if (row.action === "create") {
          const { data, error } = await supabase
            .from("products")
            .insert(toProductRow(row.values))
            .select("id")
            .single();
          if (error) throw error;
          id = data.id;
        } else if (row.fieldsChanged) {
          const { error } = await supabase
            .from("products")
            .update(toProductRow(row.values))
            .eq("id", id!);
          if (error) throw error;
        }
        if (row.stockDelta) {
          const { error } = await supabase.rpc("adjust_stock", {
            p_product_id: id!,
            p_quantity: row.stockDelta,
            p_movement_type: row.action === "create" ? "initial" : "adjustment",
            p_reason:
              row.action === "create" ? "Carga inicial (importación CSV)" : "Importación desde CSV",
          });
          if (error) throw error;
        }
        if (row.specs) {
          const { error } = await supabase.rpc("set_product_specs", {
            p_product_id: id!,
            p_specs: row.specs.map((spec) => ({ spec_id: spec.specId, value: spec.value })),
          });
          if (error) throw error;
        }
        touched.add(row.values.slug);
        const previous = id ? previousSlugs.get(id) : undefined;
        if (previous) touched.add(previous);
        results.push({ ...base, ok: true });
      } catch (error) {
        results.push({ ...base, ok: false, message: rowError(error) });
      }
    }

    if (touched.size) revalidateCatalog({ productSlugs: [...touched] });
    return { results };
  },
);
