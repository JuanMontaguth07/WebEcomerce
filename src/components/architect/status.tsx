import {
  STATUS_LABELS,
  type CompatibilityStatus,
  type PartKind,
} from "@/features/compatibility/types";
import { cn } from "@/lib/utils";

const DOT: Record<CompatibilityStatus, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  unknown: "bg-muted-foreground",
};

const TEXT: Record<CompatibilityStatus, string> = {
  ok: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  unknown: "text-muted-foreground",
};

/** Punto de color del estado; con `null` (sin elegir), un aro punteado. */
export function StatusDot({
  status,
  className,
}: {
  status: CompatibilityStatus | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        status ? DOT[status] : "border-[1.5px] border-dashed border-muted-foreground",
        className,
      )}
    />
  );
}

/** Estado con su nombre («Compatible», «Advertencia»…), en su color. */
export function StatusLabel({
  status,
  className,
}: {
  status: CompatibilityStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold",
        TEXT[status],
        className,
      )}
    >
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Categoría cuya ilustración representa cada pieza (category-illustration). */
export const PART_ILLUSTRATION: Record<PartKind, string> = {
  cpu: "procesadores",
  motherboard: "placas-madre",
  gpu: "tarjetas-graficas",
  ram: "memorias-ram",
  storage: "almacenamiento",
  psu: "fuentes-de-poder",
  cooler: "refrigeracion",
  case: "gabinetes",
};
