import type {
  AlertKind,
  ChatMessage,
  ChatReaction,
  LiveAlert,
  MessageReaction,
  OrderRef,
  ProductRef,
} from "./types";

/** Filas de la base (consulta inicial o Realtime) al formato del panel. */
export function toAlert(row: {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  actor_id: string | null;
  created_at: string;
}): LiveAlert {
  return {
    id: row.id,
    kind: row.kind as AlertKind,
    title: row.title,
    body: row.body,
    href: row.href,
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}

export function toMessage(row: {
  id: string;
  author_id: string;
  body: string;
  reply_to?: string | null;
  product_id?: string | null;
  mentions?: string[] | null;
  deleted_at?: string | null;
  created_at: string;
}): ChatMessage {
  return {
    id: row.id,
    authorId: row.author_id,
    body: row.body,
    replyTo: row.reply_to ?? null,
    productId: row.product_id ?? null,
    mentions: row.mentions ?? [],
    deletedAt: row.deleted_at ?? null,
    createdAt: row.created_at,
  };
}

export function toReaction(row: {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}): MessageReaction {
  return {
    id: row.id,
    messageId: row.message_id,
    userId: row.user_id,
    emoji: row.emoji as ChatReaction,
  };
}

export function toOrderRef(row: {
  id: string;
  order_number: number;
  status: OrderRef["status"];
  customer_name: string;
  total: number;
}): OrderRef {
  return {
    id: row.id,
    number: row.order_number,
    status: row.status,
    customer: row.customer_name,
    total: row.total,
  };
}

export function toProductRef(row: {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  product_images?: { storage_path: string; alt_text: string | null }[] | null;
}): ProductRef {
  const image = row.product_images?.[0];
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    active: row.is_active,
    image: image ? { path: image.storage_path, alt: image.alt_text } : null,
  };
}
