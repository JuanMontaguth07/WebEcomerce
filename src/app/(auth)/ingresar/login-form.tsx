"use client";

import { AlertCircleIcon } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldControl, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn, type SignInState } from "@/features/auth/actions";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const message = state.error ?? notice;

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {message && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {message}
        </p>
      )}

      <Field error={state.fieldErrors?.email}>
        <FieldLabel>Correo electrónico</FieldLabel>
        <FieldControl>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={state.email}
            autoFocus
          />
        </FieldControl>
      </Field>

      <Field error={state.fieldErrors?.password}>
        <FieldLabel>Contraseña</FieldLabel>
        <FieldControl>
          <Input name="password" type="password" autoComplete="current-password" required />
        </FieldControl>
      </Field>

      <Button type="submit" size="lg" isLoading={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
