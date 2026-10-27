import { discountPercent, formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

type PriceProps = {
  price: number;
  compareAtPrice: number | null;
  size?: "sm" | "lg";
  className?: string;
};

/** Precio actual, precio anterior tachado y descuento, con texto accesible. */
export function Price({ price, compareAtPrice, size = "sm", className }: PriceProps) {
  const discount = discountPercent(price, compareAtPrice);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums", className)}>
      <span
        className={cn(
          "font-heading font-bold font-stretch-112%",
          size === "lg" ? "text-3xl md:text-4xl" : "text-lg",
        )}
      >
        <span className="sr-only">Precio: </span>
        {formatCOP(price)}
      </span>
      {discount !== null && compareAtPrice !== null && (
        <>
          <s className={cn("text-muted-foreground", size === "lg" ? "text-base" : "text-sm")}>
            <span className="sr-only">Antes: </span>
            {formatCOP(compareAtPrice)}
          </s>
          {size === "lg" && (
            <span className="rounded-md bg-sale/10 px-2 py-0.5 text-sm font-semibold text-sale">
              Ahorras {formatCOP(compareAtPrice - price)}
            </span>
          )}
        </>
      )}
    </div>
  );
}
