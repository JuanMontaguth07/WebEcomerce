import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CATALOG_TAGS } from "@/features/catalog/queries";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { FEATURED_BUILDS_TAG, type FeaturedBuild } from "./featured";

/** PCs ya armadas visibles, en el orden que dejó el admin (cambian con los precios). */
export async function getFeaturedBuilds(): Promise<FeaturedBuild[]> {
  "use cache";
  cacheTag(FEATURED_BUILDS_TAG, CATALOG_TAGS.products);
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true }).rpc("get_featured_builds");
  if (error) throw new Error(`[architect] PCs armadas: ${error.message.slice(0, 300)}`);
  return ((data as FeaturedBuild[] | null) ?? []).map((build) => ({
    ...build,
    total: Number(build.total),
    components: build.components.map((part) => ({ ...part, price: Number(part.price) })),
  }));
}

export type AdminFeaturedBuild = {
  id: string;
  title: string;
  tag: string | null;
  description: string | null;
  isActive: boolean;
  code: string;
  name: string;
  total: number;
};

/** Las recomendadas, también las ocultas, para el panel. */
export async function listAdminFeaturedBuilds(): Promise<AdminFeaturedBuild[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("featured_builds")
    .select("id, title, tag, description, is_active, build:builds(share_code, name, total)")
    .order("position")
    .order("created_at");
  if (error) throw error;
  return data.flatMap((row) =>
    row.build
      ? [
          {
            id: row.id,
            title: row.title,
            tag: row.tag,
            description: row.description,
            isActive: row.is_active,
            code: row.build.share_code,
            name: row.build.name,
            total: Number(row.build.total),
          },
        ]
      : [],
  );
}

export type RecentBuild = {
  id: string;
  code: string;
  name: string;
  mode: "guided" | "free";
  source: "catalog" | "demo";
  total: number;
  parts: number;
  createdAt: string;
  featured: boolean;
};

/** Las últimas configuraciones que guardaron los clientes (y el admin). */
export async function listRecentBuilds(limit = 30): Promise<RecentBuild[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("builds")
    .select(
      "id, share_code, name, mode, source, total, created_at, parts:build_components(count), featured:featured_builds(id)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    code: row.share_code,
    name: row.name,
    mode: row.mode as RecentBuild["mode"],
    source: row.source as RecentBuild["source"],
    total: Number(row.total),
    parts: row.parts[0]?.count ?? 0,
    createdAt: row.created_at,
    featured: Array.isArray(row.featured) ? row.featured.length > 0 : Boolean(row.featured),
  }));
}
