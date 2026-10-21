import Image from "next/image";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { CategoryIllustration } from "./category-illustration";

type ProductImageProps = {
  image: { path: string; alt: string } | null;
  categorySlug: string;
  /** Texto alternativo si se usa la ilustración (nombre del producto). */
  fallbackAlt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** Foto del producto o, si aún no tiene, la ilustración de su categoría. */
export function ProductImage({
  image,
  categorySlug,
  fallbackAlt,
  sizes,
  priority = false,
  className,
}: ProductImageProps) {
  if (image) {
    return (
      <Image
        src={storageImageUrl(image.path)}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-contain p-4", className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${fallbackAlt} (imagen ilustrativa)`}
      className={cn("grid size-full place-items-center p-[12%] text-muted-foreground", className)}
    >
      <CategoryIllustration categorySlug={categorySlug} />
    </div>
  );
}
