import { SparklesIcon } from "lucide-react";
import type { UniqueProduct } from "@/features/catalog/queries";
import { ProductCard } from "./product-card";

/** «Piezas únicas»: cada producto con el motivo por el que es especial. */
export function UniqueShowcase({ items }: { items: UniqueProduct[] }) {
  if (!items.length) return null;

  return (
    <section aria-labelledby="piezas-unicas" className="container-page grid gap-6">
      <div className="grid gap-1">
        <h2 id="piezas-unicas" className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
          <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-primary" />
          Piezas únicas
        </h2>
        <p className="text-muted-foreground">
          Productos poco comunes que vale la pena mirar dos veces, y por qué.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map(({ product, note }) => (
          <li key={product.id} className="grid content-start gap-2">
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
