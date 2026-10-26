import "server-only";
import { sanitizeSearch } from "@/features/admin/shared";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVITY_GROUPS,
  referencedIds,
  type ActivityAction,
  type ActivityEntry,
  type ActivityGroup,
  type ReferenceNames,
} from "./format";

export const ACTIVITY_PAGE_SIZE = 40;

type Filters = {
  group?: ActivityGroup;
  action?: ActivityAction;
  /** Objeto principal: un producto muestra también sus imágenes, ficha e inventario. */
  entityId?: string;
  q?: string;
  page?: number;
  limit?: number;
};

/** Historial general (solo administradores, por RLS). */
export async function listActivity({
  group,
  action,
  entityId,
  q,
  page = 1,
  limit = ACTIVITY_PAGE_SIZE,
}: Filters = {}) {
  const supabase = await createClient();
  const from = (page - 1) * limit;
  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + limit - 1);

  if (group) query = query.in("entity", [...ACTIVITY_GROUPS[group].entities]);
  if (action) query = query.eq("action", action);
  if (entityId) query = query.eq("entity_id", entityId);
  const search = sanitizeSearch(q);
  if (search) {
    query = query.or(
      `entity_label.ilike.%${search}%,actor_label.ilike.%${search}%,reason.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const entries: ActivityEntry[] = data.map((row) => ({
    id: Number(row.id),
    occurredAt: row.occurred_at,
    actorId: row.actor_id,
    actorLabel: row.actor_label,
    entity: row.entity as ActivityEntry["entity"],
    action: row.action as ActivityAction,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    changes: (row.changes as Record<string, unknown> | null) ?? null,
    reason: row.reason,
  }));

  const context = await resolveContext(supabase, entries);
  return {
    entries,
    ...context,
    total: count ?? 0,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export type ActivityPage = Awaited<ReturnType<typeof listActivity>>;

/**
 * Qué objetos siguen existiendo (para enlazarlos) y los nombres actuales de
 * categorías y marcas citadas en los cambios.
 */
async function resolveContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entries: ActivityEntry[],
): Promise<{ existing: Set<string>; names: ReferenceNames }> {
  const idsFor = (entities: string[]) => [
    ...new Set(
      entries.flatMap((entry) =>
        entities.includes(entry.entity) && entry.entityId ? [entry.entityId] : [],
      ),
    ),
  ];
  const productIds = idsFor(["product", "product_image", "product_specs", "inventory"]);
  const references = referencedIds(entries);
  const categoryIds = [...new Set([...idsFor(["category", "spec_definition"]), ...references])];
  const brandIds = [...new Set([...idsFor(["brand"]), ...references])];
  const orderIds = idsFor(["order"]);

  const select = async (table: "products" | "categories" | "brands" | "orders", ids: string[]) => {
    if (!ids.length) return [] as { id: string; name?: string }[];
    const columns = table === "orders" ? "id" : "id, name";
    const { data, error } = await supabase.from(table).select(columns).in("id", ids);
    if (error) throw error;
    return data as unknown as { id: string; name?: string }[];
  };

  const [products, categories, brands, orders] = await Promise.all([
    select("products", productIds),
    select("categories", categoryIds),
    select("brands", brandIds),
    select("orders", orderIds),
  ]);

  const existing = new Set([...products, ...categories, ...brands, ...orders].map((row) => row.id));
  const names: ReferenceNames = new Map(
    [...categories, ...brands].flatMap((row) => (row.name ? [[row.id, row.name] as const] : [])),
  );
  return { existing, names };
}
