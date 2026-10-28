import {
  AtSignIcon,
  MessageCircleIcon,
  PackageXIcon,
  ShoppingBagIcon,
  TrendingDownIcon,
  TruckIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ALERT_META, type AlertTone, type LiveAlert } from "@/features/admin-live/types";
import { cn } from "@/lib/utils";

const ICONS: Record<LiveAlert["kind"], LucideIcon> = {
  order_new: ShoppingBagIcon,
  order_status: TruckIcon,
  stock_low: TrendingDownIcon,
  stock_out: PackageXIcon,
  chat: MessageCircleIcon,
  mention: AtSignIcon,
};

/** Degradados de «app» como los íconos de iOS: se ven igual en ambos temas. */
const TONES: Record<AlertTone, string> = {
  green: "bg-[linear-gradient(145deg,#4ade80,#059669)] shadow-[0_4px_14px_-4px_#05966999]",
  blue: "bg-[linear-gradient(145deg,#60a5fa,#2563eb)] shadow-[0_4px_14px_-4px_#2563eb99]",
  amber: "bg-[linear-gradient(145deg,#fcd34d,#d97706)] shadow-[0_4px_14px_-4px_#d9770699]",
  red: "bg-[linear-gradient(145deg,#fb7185,#e11d48)] shadow-[0_4px_14px_-4px_#e11d4899]",
  violet: "bg-[linear-gradient(145deg,#c4b5fd,#7c3aed)] shadow-[0_4px_14px_-4px_#7c3aed99]",
  pink: "bg-[linear-gradient(145deg,#f9a8d4,#db2777)] shadow-[0_4px_14px_-4px_#db277799]",
};

/** Ícono cuadrado redondeado del tipo de alerta, con su color. */
export function AppIcon({ kind, className }: { kind: LiveAlert["kind"]; className?: string }) {
  const Icon = ICONS[kind];
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[0.7rem] text-white",
        TONES[ALERT_META[kind].tone],
        className,
      )}
    >
      <Icon className="size-[55%]" strokeWidth={2.25} />
    </span>
  );
}
