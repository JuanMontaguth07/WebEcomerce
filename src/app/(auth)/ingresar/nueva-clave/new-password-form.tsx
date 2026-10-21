"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldControl, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updatePassword, type NewPasswordState } from "@/features/auth/actions";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<NewPasswordState, FormData>(updatePassword, {});

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
      <Field error={state.fieldErrors?.password} described>
        <FieldLabel>Nueva contraseña</FieldLabel>
        <FieldControl>
          <Input name="password" type="password" autoComplete="new-password" required autoFocus />
        </FieldControl>
        <FieldDescription>
          Mínimo 10 caracteres, con mayúsculas, minúsculas y números.
        </FieldDescription>
      </Field>
      <Field error={state.fieldErrors?.confirm}>
        <FieldLabel>Repite la contraseña</FieldLabel>
        <FieldControl>
          <Input name="confirm" type="password" autoComplete="new-password" required />
        </FieldControl>
      </Field>
      <Button type="submit" size="lg" isLoading={pending}>
        Guardar y entrar al panel
      </Button>
    </form>
  );
}
