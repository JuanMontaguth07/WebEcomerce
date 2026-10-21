import { Badge } from "@/components/ui/badge";
import { getAvailability } from "@/features/catalog/availability";

const VARIANT = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "destructive",
} as const;

export function StockBadge({
  stock,
  lowStockThreshold,
  className,
}: {
  stock: number;
  lowStockThreshold: number;
  className?: string;
}) {
  const availability = getAvailability(stock, lowStockThreshold);
  return (
    <Badge variant={VARIANT[availability.status]} className={className}>
      {availability.label}
    </Badge>
  );
}
