import type { MetadataRoute } from "next";
import { getActiveProductSlugs, getBrands, getCategories } from "@/features/catalog/queries";
import { absoluteUrl } from "@/lib/seo";

const STATIC_PAGES = [
  "/",
  "/productos",
  "/nosotros",
  "/terminos",
  "/privacidad",
  "/garantias",
  "/retracto",
];

/** Páginas públicas indexables. Las consultas comparten la caché del catálogo. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands] = await Promise.all([
    getActiveProductSlugs(),
    getCategories(),
    getBrands(),
  ]);

  return [
    ...STATIC_PAGES.map((path) => ({ url: absoluteUrl(path) })),
    ...categories.map((category) => ({ url: absoluteUrl(`/categorias/${category.slug}`) })),
    ...brands.map((brand) => ({ url: absoluteUrl(`/marcas/${brand.slug}`) })),
    ...products.map((product) => ({
      url: absoluteUrl(`/productos/${product.slug}`),
      lastModified: new Date(product.updatedAt),
    })),
  ];
}
