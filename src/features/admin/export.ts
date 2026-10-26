import "server-only";
import { getAdminUser } from "@/features/auth/session";

/** Rutas de descarga del panel: solo administradores (la base también lo exige por RLS). */
export async function adminExport(build: () => Promise<Response>): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin) return new Response("No autorizado", { status: 403 });
  return build();
}

/** Recorre una consulta paginada hasta agotar los resultados o llegar al tope. */
export async function collectPages<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; pageCount: number }>,
  maxPages = 20,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(page);
    items.push(...result.items);
    if (page >= result.pageCount) break;
  }
  return items;
}
