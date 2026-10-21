import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { CartItem } from "./logic";
import { buildQuote, type CartQuote, type QuotableProduct } from "./quote";

/**
 * Cotiza el carrito con precios y stock actuales. Sin caché: el stock debe
 * ser el real en el momento de mostrarlo o de pagar.
 */
export async function quoteItems(items: CartItem[]): Promise<CartQuote> {
  if (!items.length) return buildQuote([], []);

  const { data, error } = await createPublicClient({ retry: true })
    .from("products")
    .select(
      `id, name, slug, sku, price, compare_at_price, stock,
       category:categories!inner(slug),
       images:product_images(storage_path, alt_text, position)`,
    )
    .in(
      "id",
      items.map((item) => item.productId),
    )
    .eq("is_active", true);
  if (error) throw error;

  const products: QuotableProduct[] = data.map((row) => {
    const image = [...row.images].sort((a, b) => a.position - b.position)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      price: Number(row.price),
      compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
      stock: row.stock,
      categorySlug: row.category.slug,
      image: image ? { path: image.storage_path, alt: image.alt_text } : null,
    };
  });

  return buildQuote(items, products);
}
