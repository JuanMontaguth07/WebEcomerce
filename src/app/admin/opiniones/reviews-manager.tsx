"use client";

import { CheckIcon, ExternalLinkIcon, StarIcon, Undo2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { dateTime } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moderateReview } from "@/features/reviews/actions";
import type { AdminReview } from "@/features/reviews/queries";
import type { ReviewStatus } from "@/features/reviews/types";
import { cn } from "@/lib/utils";

const TABS: { status: ReviewStatus; label: string }[] = [
  { status: "pending", label: "Por revisar" },
  { status: "approved", label: "Publicadas" },
  { status: "rejected", label: "No publicadas" },
];

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5 text-warning" aria-label={`${value} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          className={cn("size-4", index < value ? "fill-current" : "opacity-30")}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** Opiniones por revisar, publicadas y no publicadas, con los botones para moderarlas. */
export function ReviewsManager({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<ReviewStatus>(
    reviews.some((review) => review.status === "pending") ? "pending" : "approved",
  );
  const [pending, startTransition] = useTransition();
  const shown = reviews.filter((review) => review.status === tab);

  function moderate(review: AdminReview, status: ReviewStatus) {
    startTransition(async () => {
      const result = await moderateReview({ id: review.id, status });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        status === "approved"
          ? "Publicada en la tienda"
          : status === "rejected"
            ? "No se publicará"
            : "De vuelta a revisión",
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Estado" className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const count = reviews.filter((review) => review.status === item.status).length;
          return (
            <button
              key={item.status}
              type="button"
              role="tab"
              aria-selected={tab === item.status}
              onClick={() => setTab(item.status)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === item.status
                  ? "border-primary bg-primary-soft text-primary"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <span className="rounded-full bg-secondary px-1.5 font-mono text-xs tabular-nums">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {shown.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((review) => (
            <li key={review.id} className="grid gap-3 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid gap-1">
                  <Stars value={review.rating} />
                  <p className="text-sm font-semibold">
                    {review.displayName}
                    {review.city && (
                      <span className="font-normal text-muted-foreground"> · {review.city}</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {dateTime.format(new Date(review.createdAt))}
                </span>
              </div>
              <p className="text-sm whitespace-pre-line">{review.body}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <Link
                  href={`/admin/pedidos/${review.orderId}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Pedido #{review.orderNumber ?? "—"}
                  {review.customerName && ` · ${review.customerName}`}
                  <ExternalLinkIcon className="size-3" aria-hidden />
                </Link>
                <span className="flex flex-wrap gap-2">
                  {review.status !== "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => moderate(review, "approved")}
                    >
                      <CheckIcon aria-hidden />
                      Publicar
                    </Button>
                  )}
                  {review.status === "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => moderate(review, "rejected")}
                    >
                      <XIcon aria-hidden />
                      No publicar
                    </Button>
                  )}
                  {review.status !== "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => moderate(review, "pending")}
                    >
                      <Undo2Icon aria-hidden />
                      {review.status === "approved" ? "Quitar de la tienda" : "Volver a revisar"}
                    </Button>
                  )}
                </span>
              </div>
              {review.status === "approved" && (
                <Badge variant="soft" className="w-fit">
                  Compra verificada · publicada
                </Badge>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          {tab === "pending"
            ? "No hay opiniones por revisar. Los compradores pueden opinar desde su pedido cuando lo marcas como entregado."
            : tab === "approved"
              ? "Todavía no has publicado opiniones."
              : "Ninguna opinión quedó sin publicar."}
        </p>
      )}
    </div>
  );
}
