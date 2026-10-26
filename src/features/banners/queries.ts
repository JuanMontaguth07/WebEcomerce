import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { BannerIllustration, HomeBanner } from "./types";

export const BANNERS_TAG = "home-banners";

const COLUMNS =
  "id, eyebrow, title, body, cta_label, cta_href, image_path, illustration, position, is_active";

type BannerRow = {
  id: string;
  eyebrow: string | null;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_path: string | null;
  illustration: string;
  position: number;
  is_active: boolean;
};

function toBanner(row: BannerRow): HomeBanner {
  return {
    id: row.id,
    eyebrow: row.eyebrow,
    title: row.title,
    body: row.body,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    imagePath: row.image_path,
    illustration: row.illustration as BannerIllustration,
    position: row.position,
    isActive: row.is_active,
  };
}

/** Anuncios activos de la portada, en orden. Si la consulta falla, la portada sigue sin ellos. */
export async function getHomeBanners(): Promise<HomeBanner[]> {
  "use cache";
  cacheTag(BANNERS_TAG);
  cacheLife("hours");

  const { data, error } = await createPublicClient({ retry: true })
    .from("home_banners")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("position")
    .order("created_at");
  if (error) {
    console.error(`[getHomeBanners] ${error.message}`);
    return [];
  }
  return data.map(toBanner);
}

/** Panel: todos, también los apagados. */
export async function listAdminBanners(): Promise<HomeBanner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("home_banners")
    .select(COLUMNS)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return data.map(toBanner);
}
