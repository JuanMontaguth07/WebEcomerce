"use client";

import { PackageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/admin-ui";
import type { TeamMember } from "@/features/account/team";
import { tokenize } from "@/features/admin-live/format";
import type { OrderRef, ProductRef } from "@/features/admin-live/types";
import { formatCOP } from "@/lib/format";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { AppIcon } from "./app-icon";

/**
 * Texto de un mensaje con los pedidos (#1042) como enlaces y las menciones
 * (@Ana) resaltadas en el color de quien se menciona.
 */
export function MessageText({
  body,
  handles,
  team,
  selfId,
  orders,
  inMine,
}: {
  body: string;
  handles: { userId: string; handle: string }[];
  team: TeamMember[];
  selfId: string;
  orders: Record<number, OrderRef | null>;
  inMine: boolean;
}) {
  return tokenize(body, handles).map((token, index) => {
    if (token.type === "order") {
      const order = orders[token.number];
      if (!order) return token.text;
      return (
        <Link
          key={index}
          href={`/admin/pedidos/${order.id}`}
          className="font-semibold underline decoration-current/40 underline-offset-2 hover:decoration-current"
        >
          {token.text}
        </Link>
      );
    }
    if (token.type === "mention") {
      const person = team.find((item) => item.id === token.userId);
      return (
        <span
          key={index}
          data-admin-accent={inMine ? undefined : person?.accent}
          className={cn(
            "rounded-md font-semibold",
            !inMine && "text-primary",
            token.userId === selfId && (inMine ? "bg-black/15 px-1" : "bg-primary-soft px-1"),
          )}
        >
          {token.text}
        </span>
      );
    }
    return token.text;
  });
}

const card =
  "mt-2 flex w-full min-w-0 items-center gap-2.5 rounded-xl border bg-popover p-2 text-left whitespace-normal text-popover-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Pedido citado: número, estado, cliente y total. */
export function OrderCard({ order }: { order: OrderRef }) {
  return (
    <Link href={`/admin/pedidos/${order.id}`} className={card}>
      <AppIcon kind="order_new" className="size-9" />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
          Pedido #{order.number}
          <OrderStatusBadge status={order.status} />
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {order.customer} · {formatCOP(order.total)}
        </span>
      </span>
    </Link>
  );
}

/** Producto compartido: foto, nombre, SKU, precio y cómo va su stock. */
export function ProductCard({ product }: { product: ProductRef }) {
  const out = product.stock <= 0;
  const low = !out && product.stock <= product.lowStockThreshold;
  return (
    <Link href={`/admin/productos/${product.id}`} className={card}>
      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-secondary text-muted-foreground">
        {product.image ? (
          <Image
            src={storageImageUrl(product.image.path)}
            alt=""
            fill
            sizes="48px"
            className="object-contain p-1"
          />
        ) : (
          <PackageIcon className="size-5" aria-hidden />
        )}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-[0.8125rem] leading-snug font-semibold">
          {product.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {formatCOP(product.price)} · SKU {product.sku}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            out ? "text-destructive" : low ? "text-warning" : "text-success",
          )}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {out ? "Agotado" : low ? `Quedan ${product.stock}` : `${product.stock} en stock`}
          {!product.active && <span className="text-muted-foreground">· Oculto</span>}
        </span>
      </span>
    </Link>
  );
}

/** Lugar de la tarjeta mientras llega, o cuando lo compartido ya no existe. */
export function CardPlaceholder({ gone }: { gone?: boolean }) {
  return gone ? (
    <span className={cn(card, "pointer-events-none text-xs text-muted-foreground italic")}>
      <PackageIcon className="size-4" aria-hidden />
      Este producto ya no existe
    </span>
  ) : (
    <span aria-hidden className={cn(card, "pointer-events-none h-16 animate-pulse")} />
  );
}
