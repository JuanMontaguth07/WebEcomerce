import type { ProductSummary } from "@/features/catalog/types";
import type { AppHref } from "@/lib/routes";
import { ProductGrid } from "./product-grid";
import { SectionHeader } from "./section-header";

type HomeSectionProps = {
  id: string;
  title: string;
  description?: string;
  href?: AppHref;
  linkLabel?: string;
  products: ProductSummary[];
};

/** Bloque de la home con título, enlace "ver todo" y grilla. No se muestra si está vacío. */
export function HomeSection({
  id,
  title,
  description,
  href,
  linkLabel,
  products,
}: HomeSectionProps) {
  if (!products.length) return null;

  return (
    <section aria-labelledby={id} className="container-page grid gap-6">
      <SectionHeader
        id={id}
        title={title}
        description={description}
        href={href}
        linkLabel={linkLabel}
      />
      <ProductGrid products={products} stagger />
    </section>
  );
}
