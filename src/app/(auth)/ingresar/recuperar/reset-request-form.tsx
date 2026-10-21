"use client";

import { MailCheckIcon } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldControl, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, type ResetRequestState } from "@/features/auth/actions";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.sent) {
    return (
      <div role="status" className="grid justify-items-center gap-3 text-center">
        <MailCheckIcon className="size-10 text-success" aria-hidden />
        <p className="font-semibold">Revisa tu correo</p>
        <p className="text-sm text-muted-foreground">
          Si el correo corresponde a una cuenta del panel, te enviamos un enlace para crear una
          contraseña nueva. Puede tardar unos minutos; revisa también la carpeta de spam.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
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
            autoFocus
          />
        </FieldControl>
      </Field>
      <Button type="submit" size="lg" isLoading={pending}>
        Enviar enlace
      </Button>
    </form>
  );
}
