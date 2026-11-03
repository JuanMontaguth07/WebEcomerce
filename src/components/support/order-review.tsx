"use client";

import { CheckCircle2Icon, StarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { OrderReview } from "@/features/reviews/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const RATING_LABELS = ["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"];

const MESSAGES: Record<string, string> = {
  NOT_DELIVERED: "Podrás opinar cuando recibas tu pedido.",
  ALREADY_REVIEWED: "Ya revisamos tu opinión: no se puede cambiar.",
  NOT_FOUND: "No encontramos el pedido. Abre de nuevo el enlace que te enviamos.",
  VALIDATION: "Revisa las estrellas, el comentario (mínimo 10 letras) y el nombre.",
};

/**
 * «¿Qué tal tu compra?» en la página de un pedido entregado. La opinión queda
 * en revisión hasta que la tienda la apruebe; mientras tanto se puede corregir.
 */
export function OrderReviewForm({
  orderId,
  token,
  initial,
  suggestedName,
  city,
}: {
  orderId: string;
  token: string;
  initial: OrderReview | null;
  suggestedName: string;
  city: string;
}) {
  const router = useRouter();
  const id = useId();
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [name, setName] = useState(initial?.displayName ?? suggestedName);
  const [showCity, setShowCity] = useState(initial?.showCity ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating) return setError("Elige de 1 a 5 estrellas.");
    if (body.trim().length < 10) return setError("Cuéntanos un poco más (mínimo 10 letras).");
    if (name.trim().length < 2) return setError("Escribe el nombre que quieres mostrar.");
    setError(null);
    startTransition(async () => {
      const { error: rpcError } = await createClient().rpc("submit_store_review", {
        p_order_id: orderId,
        p_token: token,
        p_rating: rating,
        p_body: body.trim(),
        p_name: name.trim(),
        p_show_city: showCity,
      });
      if (rpcError) {
        const code = Object.keys(MESSAGES).find((key) => rpcError.message.includes(key));
        setError(
          code ? (MESSAGES[code] ?? null) : "No pudimos guardar tu opinión. Intenta de nuevo.",
        );
        return;
      }
      setSaved({
        rating,
        body: body.trim(),
        displayName: name.trim(),
        showCity,
        status: "pending",
      });
      setEditing(false);
      router.refresh();
    });
  }

  if (saved && !editing) {
    return (
      <section
        aria-labelledby={`${id}-title`}
        className="grid gap-3 rounded-xl border bg-card p-5 sm:p-6"
      >
        <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-bold">
          <CheckCircle2Icon className="size-5 text-success" aria-hidden />
          {saved.status === "approved"
            ? "¡Gracias! Tu opinión está publicada"
            : saved.status === "rejected"
              ? "Gracias por tu opinión"
              : "¡Gracias! Estamos revisando tu opinión"}
        </h2>
        <p className="flex gap-0.5 text-warning" aria-label={`${saved.rating} de 5 estrellas`}>
          {Array.from({ length: 5 }, (_, index) => (
            <StarIcon
              key={index}
              className={cn("size-4", index < saved.rating ? "fill-current" : "opacity-30")}
              aria-hidden
            />
          ))}
        </p>
        <blockquote className="text-sm text-muted-foreground">«{saved.body}»</blockquote>
        <p className="text-xs text-muted-foreground">
          {saved.status === "pending"
            ? `Saldrá como «${saved.displayName}${saved.showCity ? `, ${city}` : ""}» cuando la aprobemos.`
            : saved.status === "rejected"
              ? "La leímos, pero no la publicamos. Si quieres contarnos algo más, escríbenos."
              : `Publicada como «${saved.displayName}${saved.showCity ? `, ${city}` : ""}».`}
        </p>
        {saved.status === "pending" && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-fit"
            onClick={() => setEditing(true)}
          >
            Corregir mi opinión
          </Button>
        )}
      </section>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby={`${id}-title`}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="grid gap-1">
        <h2 id={`${id}-title`} className="text-lg font-bold">
          ¿Qué tal tu compra?
        </h2>
        <p className="text-sm text-muted-foreground">
          Tu opinión ayuda a otros a decidir. La revisamos antes de publicarla, con el nombre que
          elijas.
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Calificación</legend>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1" role="radiogroup" aria-label="Estrellas">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}: ${RATING_LABELS[value]}`}
                onClick={() => setRating(value)}
                className="grid size-10 place-items-center rounded-lg text-warning transition-transform outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <StarIcon
                  className={cn("size-7", value <= rating ? "fill-current" : "opacity-30")}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          {rating > 0 && <span className="text-sm font-semibold">{RATING_LABELS[rating]}</span>}
        </div>
      </fieldset>

      <label className="grid gap-1.5" htmlFor={`${id}-body`}>
        <span className="text-sm font-semibold">Tu comentario</span>
        <textarea
          id={`${id}-body`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={600}
          rows={4}
          placeholder="¿Cómo te fue con el producto, el envío y la atención?"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <span className="text-right text-xs text-muted-foreground tabular-nums">
          {body.length}/600
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <label className="grid gap-1.5" htmlFor={`${id}-name`}>
          <span className="text-sm font-semibold">Nombre para mostrar</span>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </label>
        <label className="flex items-center gap-2 text-sm" htmlFor={`${id}-city`}>
          <input
            id={`${id}-city`}
            type="checkbox"
            checked={showCity}
            onChange={(event) => setShowCity(event.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          Mostrar mi ciudad ({city})
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isLoading={pending}>
          Enviar opinión
        </Button>
        {saved && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          Al enviarla aceptas que la publiquemos con ese nombre si la aprobamos.
        </span>
      </div>
    </form>
  );
}
