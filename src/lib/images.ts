import { publicEnv } from "@/lib/env";

export const CATALOG_BUCKET = "catalog";

/** URL pública de una imagen del bucket del catálogo a partir de su ruta. */
export function storageImageUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CATALOG_BUCKET}/${encoded}`;
}
