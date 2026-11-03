"use client";

import { CheckCircle2Icon } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Darse de baja de las novedades con el correo. La respuesta es la misma aunque no estuviera. */
export function UnsubscribeForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Escribe un correo válido.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error: rpcError } = await createClient().rpc("unsubscribe_newsletter", {
        p_email: email.trim(),
      });
      if (rpcError) {
        setError("No pudimos procesarlo. Intenta de nuevo o escríbenos.");
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <p role="status" className="flex items-center gap-2 font-semibold text-success">
        <CheckCircle2Icon className="size-5" aria-hidden />
        Listo: ese correo ya no recibirá novedades.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid max-w-md gap-3">
      <label htmlFor={`${id}-email`} className="text-sm font-semibold">
        Tu correo
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 min-w-0 flex-1 basis-56 rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="submit" isLoading={pending} className="h-11">
          Darme de baja
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
