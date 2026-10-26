import Image from "next/image";
import { flagTextColor, type ProductFlag } from "@/features/flags/types";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/**
 * Bandera de marca o línea: una cinta del color de la marca pegada al borde,
 * con su logo. El texto es blanco o casi negro según el color de fondo.
 */
export function ProductFlagTag({
  flag,
  logoSrc,
  size = "sm",
  className,
}: {
  flag: Pick<ProductFlag, "name" | "color" | "logoPath" | "showName">;
  /** Vista previa del panel: imagen aún sin subir (blob:). */
  logoSrc?: string | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  const src = logoSrc ?? (flag.logoPath ? storageImageUrl(flag.logoPath) : null);
  const logoSize = size === "sm" ? 18 : 24;

  return (
    <span
      style={
        {
          "--flag": flag.color,
          "--flag-text": flagTextColor(flag.color),
        } as React.CSSProperties
      }
      className={cn(
        "product-flag inline-flex max-w-[85%] items-center font-bold whitespace-nowrap",
        size === "sm" ? "h-7 gap-1.5 pr-4 pl-2.5 text-xs" : "h-9 gap-2 pr-5 pl-3 text-sm",
        className,
      )}
    >
      {src && (
        <Image
          src={src}
          alt={flag.showName ? "" : flag.name}
          width={logoSize}
          height={logoSize}
          unoptimized={src.startsWith("blob:")}
          className="shrink-0 object-contain"
          style={{ width: logoSize, height: logoSize }}
        />
      )}
      {flag.showName ? (
        <span className="truncate">{flag.name}</span>
      ) : (
        !src && <span className="sr-only">{flag.name}</span>
      )}
    </span>
  );
}
