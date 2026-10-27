import Image from "next/image";
import { CategoryIllustration } from "@/components/shop/category-illustration";
import type { ArchitectPart } from "@/features/architect/types";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { PART_ILLUSTRATION } from "./status";

/** Miniatura de una pieza: su foto o la ilustración de su tipo. */
export function PartThumb({ part, className }: { part: ArchitectPart; className?: string }) {
  return (
    <span
      className={cn(
        "relative grid aspect-4/3 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-secondary text-muted-foreground",
        className,
      )}
    >
      {part.image ? (
        <Image
          src={storageImageUrl(part.image.path)}
          alt=""
          fill
          sizes="5rem"
          className="object-contain p-1.5"
        />
      ) : (
        <CategoryIllustration categorySlug={PART_ILLUSTRATION[part.kind]} className="w-[80%]" />
      )}
    </span>
  );
}
