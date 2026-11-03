import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import {
  STORE_REVIEWS_TAG,
  type OrderReview,
  type PublishedReview,
  type ReviewStatus,
  type ReviewSummary,
} from "./types";

type RawReview = {
  id: string;
  rating: number;
  body: string;
  display_name: string;
  city: string | null;
  created_at: string;
};

/** Las opiniones publicadas, las más recientes primero, con el promedio. */
export async function getStoreReviews(limit = 20): Promise<ReviewSummary> {
  "use cache";
  cacheTag(STORE_REVIEWS_TAG);
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true }).rpc("get_store_reviews", {
    p_limit: limit,
  });
  if (error) throw new Error(`[opiniones] ${error.message.slice(0, 300)}`);
  const raw = (data ?? { count: 0, average: null, items: [] }) as {
    count: number;
    average: number | null;
    items: RawReview[];
  };
  return {
    count: Number(raw.count),
    average: raw.average === null ? null : Number(raw.average),
    items: raw.items.map((item): PublishedReview => ({
      id: item.id,
      rating: item.rating,
      body: item.body,
      displayName: item.display_name,
      city: item.city,
      createdAt: item.created_at,
    })),
  };
}

/** La opinión que dejó el comprador de un pedido (con el enlace privado). */
export async function getOrderReview(orderId: string, token: string): Promise<OrderReview | null> {
  const { data, error } = await createPublicClient({ retry: true }).rpc("get_order_review", {
    p_order_id: orderId,
    p_token: token,
  });
  if (error) throw error;
  if (!data) return null;
  const raw = data as {
    rating: number;
    body: string;
    display_name: string;
    show_city: boolean;
    status: ReviewStatus;
  };
  return {
    rating: raw.rating,
    body: raw.body,
    displayName: raw.display_name,
    showCity: raw.show_city,
    status: raw.status,
  };
}

export type AdminReview = PublishedReview & {
  status: ReviewStatus;
  orderId: string;
  orderNumber: number | null;
  customerName: string | null;
  reviewedAt: string | null;
};

/** Para el panel: todas, las por revisar primero. */
export async function listAdminReviews(): Promise<AdminReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_reviews")
    .select(
      "id, rating, body, display_name, city, status, created_at, reviewed_at, order_id, order:orders(order_number, customer_name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const rank: Record<ReviewStatus, number> = { pending: 0, approved: 1, rejected: 2 };
  return data
    .map((row) => ({
      id: row.id,
      rating: row.rating,
      body: row.body,
      displayName: row.display_name,
      city: row.city,
      createdAt: row.created_at,
      status: row.status as ReviewStatus,
      reviewedAt: row.reviewed_at,
      orderId: row.order_id,
      orderNumber: row.order?.order_number ?? null,
      customerName: row.order?.customer_name ?? null,
    }))
    .sort((a, b) => rank[a.status] - rank[b.status]);
}
