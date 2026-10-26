import { siteConfig } from "@/config/site";
import { storageImageUrl } from "@/lib/images";
import { absoluteUrl } from "@/lib/seo";
import { getAvailability, type AvailabilityStatus } from "./availability";
import type { ProductDetail } from "./types";

/**
 * Datos estructurados (schema.org) del catálogo. Solo usan información real del
 * producto y de la configuración del sitio: nada de calificaciones, envíos o
 * políticas que el negocio aún no ha definido.
 */

const SCHEMA_AVAILABILITY: Record<AvailabilityStatus, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
};

export function productJsonLd(product: ProductDetail) {
  const url = absoluteUrl(`/productos/${product.slug}`);
  const description =
    product.seoDescription ?? product.shortDescription ?? product.description?.split(/\n{2,}/)[0];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#producto`,
    name: product.name,
    sku: product.sku,
    url,
    ...(description ? { description: description.slice(0, 5000) } : {}),
    ...(product.images.length > 0 && {
      image: product.images.map((image) => storageImageUrl(image.path)),
    }),
    ...(product.brand !== null && { brand: { "@type": "Brand", name: product.brand.name } }),
    category: product.category.name,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: siteConfig.currency,
      price: product.price,
      availability:
        SCHEMA_AVAILABILITY[getAvailability(product.stock, product.lowStockThreshold).status],
      seller: { "@type": "Organization", name: siteConfig.name },
    },
  };
}

/** Migas de pan; el último elemento (la página actual) puede ir sin enlace. */
export function breadcrumbJsonLd(items: { name: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

/** Sitio y organización: se publican una vez, en la página de inicio. */
export function siteJsonLd() {
  const url = absoluteUrl("/");
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${url}#organizacion`, name: siteConfig.name, url },
      {
        "@type": "WebSite",
        "@id": `${url}#sitio`,
        name: siteConfig.name,
        url,
        inLanguage: siteConfig.locale,
        publisher: { "@id": `${url}#organizacion` },
      },
    ],
  };
}
