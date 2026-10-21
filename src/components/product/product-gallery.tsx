"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { CategoryIllustration } from "@/components/shop/category-illustration";
import type { ProductImage } from "@/features/catalog/types";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/** Galería con miniaturas. Flechas del teclado para cambiar de imagen. */
export function ProductGallery({
  images,
  productName,
  categorySlug,
}: {
  images: ProductImage[];
  productName: string;
  categorySlug: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  const count = images.length;
  const move = (delta: number) => setIndex((value) => (value + delta + count) % count);

  if (!current) {
    return (
      <div
        role="img"
        aria-label={`${productName} (imagen ilustrativa)`}
        className="grid aspect-square place-items-center rounded-2xl border bg-secondary p-[18%] text-muted-foreground"
      >
        <CategoryIllustration categorySlug={categorySlug} />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div
        className="group relative aspect-square overflow-hidden rounded-2xl border bg-card"
        role="region"
        aria-roledescription="galería"
        aria-label={`Imágenes de ${productName}`}
        tabIndex={count > 1 ? 0 : undefined}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") move(1);
          if (event.key === "ArrowLeft") move(-1);
        }}
      >
        <Image
          key={current.id}
          src={storageImageUrl(current.path)}
          alt={current.alt}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="animate-in object-contain p-6 duration-300 fade-in-0"
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border bg-card/90 opacity-0 shadow-card transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeftIcon className="size-5" aria-hidden />
              <span className="sr-only">Imagen anterior</span>
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border bg-card/90 opacity-0 shadow-card transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRightIcon className="size-5" aria-hidden />
              <span className="sr-only">Imagen siguiente</span>
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-card/90 px-2 py-0.5 font-mono text-xs tabular-nums">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver imagen ${i + 1} de ${count}`}
                aria-pressed={i === index}
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-lg border bg-card transition-colors",
                  i === index ? "border-primary ring-2 ring-primary/30" : "hover:border-input",
                )}
              >
                <Image
                  src={storageImageUrl(image.path)}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-contain p-1.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
