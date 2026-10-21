import "server-only";
import { updateTag } from "next/cache";
import { CATALOG_TAGS } from "./queries";

/**
 * Invalida la caché del catálogo tras una edición del panel. Solo puede
 * llamarse desde Server Actions (updateTag lee los cambios de inmediato).
 */
export function revalidateCatalog(
  options: {
    productSlugs?: string[];
    categories?: boolean;
    brands?: boolean;
  } = {},
) {
  updateTag(CATALOG_TAGS.products);
  for (const slug of options.productSlugs ?? []) updateTag(CATALOG_TAGS.product(slug));
  if (options.categories) updateTag(CATALOG_TAGS.categories);
  if (options.brands) updateTag(CATALOG_TAGS.brands);
}
