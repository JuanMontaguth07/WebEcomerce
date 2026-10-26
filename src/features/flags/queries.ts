import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { ProductFlag } from "./types";

export const FLAGS_TAG = "product-flags";

const COLUMNS = "id, name, color, logo_path, show_name, is_active";

type FlagRow = {
  id: string;
  name: string;
  color: string;
  logo_path: string | null;
  show_name: boolean;
  is_active: boolean;
};

function toFlag(row: FlagRow): ProductFlag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    logoPath: row.logo_path,
    showName: row.show_name,
    isActive: row.is_active,
  };
}

/** Etiquetas activas para la tienda. */
export async function getFlags(): Promise<ProductFlag[]> {
  "use cache";
  cacheTag(FLAGS_TAG);
  cacheLife("hours");

  const { data, error } = await createPublicClient({ retry: true })
    .from("product_flags")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`[getFlags] ${error.message}`);
  return data.map(toFlag);
}

/** Mapa id → etiqueta. Si la consulta falla, los productos se ven sin bandera. */
export async function getFlagMap(): Promise<Map<string, ProductFlag>> {
  try {
    return new Map((await getFlags()).map((flag) => [flag.id, flag]));
  } catch (error) {
    console.error(error);
    return new Map();
  }
}

/** Panel: todas (también las ocultas) con cuántos productos las usan. */
export async function listAdminFlags() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_flags")
    .select(`${COLUMNS}, products(count)`)
    .order("name");
  if (error) throw error;
  return data.map((row) => ({ ...toFlag(row), productCount: row.products[0]?.count ?? 0 }));
}

export type AdminFlag = Awaited<ReturnType<typeof listAdminFlags>>[number];
