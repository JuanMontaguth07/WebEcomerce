import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { Rarity, RarityEffect } from "./types";

export const RARITIES_TAG = "rarities";

const COLUMNS = "id, name, slug, color, effect, description, position, is_active";

type RarityRow = {
  id: string;
  name: string;
  slug: string;
  color: string;
  effect: string;
  description: string | null;
  position: number;
  is_active: boolean;
};

function toRarity(row: RarityRow): Rarity {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    effect: row.effect as RarityEffect,
    description: row.description,
    position: row.position,
    isActive: row.is_active,
  };
}

/** Niveles activos para la tienda, del mejor al más básico. */
export async function getRarities(): Promise<Rarity[]> {
  "use cache";
  cacheTag(RARITIES_TAG);
  cacheLife("hours");

  const { data, error } = await createPublicClient({ retry: true })
    .from("rarities")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("position", { ascending: false })
    .order("name");
  if (error) throw new Error(`[getRarities] ${error.message}`);
  return data.map(toRarity);
}

/** Mapa id → rareza. Si la consulta falla, la tienda sigue sin efectos visuales. */
export async function getRarityMap(): Promise<Map<string, Rarity>> {
  try {
    return new Map((await getRarities()).map((rarity) => [rarity.id, rarity]));
  } catch (error) {
    console.error(error);
    return new Map();
  }
}

/** Panel: todas (también las ocultas) con cuántos productos las usan. */
export async function listAdminRarities() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rarities")
    .select(`${COLUMNS}, products(count)`)
    .order("position", { ascending: false })
    .order("name");
  if (error) throw error;
  return data.map((row) => ({
    ...toRarity(row),
    productCount: row.products[0]?.count ?? 0,
  }));
}

export type AdminRarity = Awaited<ReturnType<typeof listAdminRarities>>[number];
