import { SparklesIcon } from "lucide-react";
import type { UniqueProduct } from "@/features/catalog/queries";
import { ProductCard } from "./product-card";
import { SectionHeader } from "./section-header";

/** «Piezas únicas»: cada producto con el motivo por el que es especial. */
export function UniqueShowcase({ items, index }: { items: UniqueProduct[]; index?: number }) {
  if (!items.length) return null;

  return (
    <section aria-labelledby="piezas-unicas" className="container-page grid gap-6">
      <SectionHeader
        id="piezas-unicas"
        index={index}
        eyebrow="Poco comunes"
        title="Piezas únicas"
        description="Productos que vale la pena mirar dos veces, y por qué."
        align="split"
        className="reveal"
      />
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4">
        {items.map(({ product, note }) => (
          <li
            key={product.id}
            className="grid w-64 shrink-0 snap-start content-start gap-2 md:w-auto"
          >
            <ProductCard product={product} />
            <p className="flex gap-2 rounded-lg border border-dashed border-primary/40 bg-primary-soft/60 px-3 py-2 text-sm">
              <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="sr-only">Por qué es única: </span>
                {note}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
