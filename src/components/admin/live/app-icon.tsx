import {
  AtSignIcon,
  MessageCircleIcon,
  PackageXIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  TrendingDownIcon,
  TruckIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ALERT_META, type LiveAlert } from "@/features/admin-live/types";
import { cn } from "@/lib/utils";
import { TILE_TONES } from "../module-tile";

const ICONS: Record<LiveAlert["kind"], LucideIcon> = {
  order_new: ShoppingBagIcon,
  order_status: TruckIcon,
  stock_low: TrendingDownIcon,
  stock_out: PackageXIcon,
  payment_receipt: ReceiptIcon,
  chat: MessageCircleIcon,
  mention: AtSignIcon,
};

/** Ícono cuadrado redondeado del tipo de alerta, con su color. */
export function AppIcon({ kind, className }: { kind: LiveAlert["kind"]; className?: string }) {
  const Icon = ICONS[kind];
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[0.7rem]",
        TILE_TONES[ALERT_META[kind].tone],
        className,
      )}
    >
      <Icon className="size-[52%]" strokeWidth={1.75} />
    </span>
  );
}
