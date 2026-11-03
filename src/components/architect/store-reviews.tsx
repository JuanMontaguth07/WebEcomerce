import { BadgeCheckIcon, StarIcon } from "lucide-react";
import { Marquee } from "@/components/shop/marquee";
import type { PublishedReview, ReviewSummary } from "@/features/reviews/types";
import { cn } from "@/lib/utils";
import { ZoneHeading } from "./architect-landing";

const average = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const monthYear = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

function ReviewCard({ review }: { review: PublishedReview }) {
  return (
    <article className="glow-follow grid h-full w-72 content-start gap-3 rounded-2xl border bg-card p-4">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="zone-gradient grid size-9 shrink-0 place-items-center rounded-full font-heading text-sm font-extrabold"
        >
          {review.displayName.charAt(0).toLocaleUpperCase("es-CO")}
        </span>
        <span className="grid min-w-0">
          <strong className="truncate text-sm">{review.displayName}</strong>
          <span className="truncate text-xs text-muted-foreground">
            {review.city ? `${review.city} · ` : ""}
            {monthYear.format(new Date(review.createdAt))}
          </span>
        </span>
      </header>
      <span className="flex text-warning" aria-label={`${review.rating} de 5 estrellas`}>
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon
            key={index}
            className={cn("size-3.5", index < review.rating ? "fill-current" : "opacity-30")}
            aria-hidden
          />
        ))}
      </span>
      <p className="line-clamp-5 text-sm text-muted-foreground">{review.body}</p>
      <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-success">
        <BadgeCheckIcon className="size-3.5" aria-hidden />
        Compra verificada
      </span>
    </article>
  );
}

/**
 * Opiniones de compradores verificados (aprobadas en el panel). Con pocas van
 * en fila quieta; con más, en una franja que se desliza. Sin opiniones no se
 * muestra nada.
 */
export function StoreReviews({ summary }: { summary: ReviewSummary }) {
  if (!summary.count || !summary.items.length) return null;
  const many = summary.items.length >= 4;
  return (
    <section aria-labelledby="opiniones" className="grid gap-5">
      <ZoneHeading
        id="opiniones"
        slug="opiniones"
        description={`${summary.average !== null ? `${average.format(summary.average)} de 5 · ` : ""}${summary.count} ${summary.count === 1 ? "opinión" : "opiniones"} de compradores verificados.`}
      />
      {many ? (
        <Marquee
          label="Opiniones"
          seconds={Math.max(30, summary.items.length * 7)}
          reverse
          itemClassName="flex"
          items={summary.items.map((review) => ({
            key: review.id,
            node: <ReviewCard review={review} />,
          }))}
        />
      ) : (
        <ul className="flex flex-wrap gap-3">
          {summary.items.map((review) => (
            <li key={review.id} className="flex">
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
