"use client";

import { CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Versión del texto de autorización que se guarda con cada suscripción. */
export const NEWSLETTER_CONSENT_VERSION = "v1";

const MESSAGES: Record<string, string> = {
  CONSENT_REQUIRED: "Marca la autorización para poder escribirte.",
  INVALID_EMAIL: "Escribe un correo válido.",
  RATE_LIMITED: "Hay muchas suscripciones en este momento. Intenta en unos minutos.",
};

/**
 * Suscripción a novedades con la autorización de datos (Ley 1581). `band`: la
 * banda grande en degradado; `compact`: la del pie de página. La respuesta es
 * la misma aunque el correo ya estuviera.
 */
export function NewsletterSignup({
  source,
  variant = "band",
}: {
  source: string;
  variant?: "band" | "compact";
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const band = variant === "band";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError(MESSAGES.INVALID_EMAIL!);
    if (!consent) return setError(MESSAGES.CONSENT_REQUIRED!);
    setError(null);
    startTransition(async () => {
      const { error: rpcError } = await createClient().rpc("subscribe_newsletter", {
        p_email: email.trim(),
        p_consent: consent,
        p_source: source,
        p_consent_version: NEWSLETTER_CONSENT_VERSION,
      });
      if (rpcError) {
        const code = Object.keys(MESSAGES).find((key) => rpcError.message.includes(key));
        setError(
          code ? (MESSAGES[code] ?? null) : "No pudimos guardar tu correo. Intenta de nuevo.",
        );
        return;
      }
      setDone(true);
    });
  }

  const consentText = (
    <>
      Autorizo a Kova Studio a usar mi correo para enviarme novedades y ofertas, según la{" "}
      <Link href="/privacidad" className="font-semibold underline underline-offset-2">
        política de datos
      </Link>
      . Me puedo{" "}
      <Link href="/novedades/baja" className="font-semibold underline underline-offset-2">
        dar de baja
      </Link>{" "}
      cuando quiera.
    </>
  );

  if (done) {
    return (
      <p
        role="status"
        className={cn(
          "flex items-center gap-2 font-semibold",
          band ? "justify-center text-lg" : "text-sm text-success",
        )}
      >
        <CheckCircle2Icon className="size-5 shrink-0" aria-hidden />
        ¡Listo! Te escribiremos cuando haya algo bueno.
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn("grid gap-3", band && "w-full max-w-lg justify-items-center")}
    >
      <div className="flex w-full flex-wrap gap-2">
        <label htmlFor={`${id}-email`} className="sr-only">
          Correo electrónico
        </label>
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={cn(
            "h-11 min-w-0 flex-1 basis-52 rounded-xl border px-4 text-sm outline-none focus-visible:ring-3",
            band
              ? "border-black/15 bg-white/90 text-[#101318] placeholder:text-[#5b6470] focus-visible:ring-white/60"
              : "border-input bg-background focus-visible:ring-ring/40",
          )}
        />
        <Button
          type="submit"
          isLoading={pending}
          className={cn("h-11", band && "bg-background text-foreground hover:bg-background/90")}
        >
          Suscribirme
        </Button>
      </div>
      <label
        htmlFor={`${id}-consent`}
        className={cn(
          "flex items-start gap-2 text-left text-xs leading-relaxed",
          !band && "text-muted-foreground",
        )}
      >
        <input
          id={`${id}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className={cn(
            "mt-0.5 size-4 shrink-0",
            band ? "accent-[#101318]" : "accent-[var(--primary)]",
          )}
        />
        <span>{consentText}</span>
      </label>
      {error && (
        <p role="alert" className={cn("text-sm font-semibold", !band && "text-destructive")}>
          {error}
        </p>
      )}
    </form>
  );
}
