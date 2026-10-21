"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldContextValue = {
  controlId: string;
  descriptionId: string;
  errorId: string;
  hasDescription: boolean;
  invalid: boolean;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField() {
  const context = React.useContext(FieldContext);
  if (!context) throw new Error("Los componentes Field* deben usarse dentro de <Field>.");
  return context;
}

type FieldProps = React.ComponentProps<"div"> & {
  /** Mensaje de error; si existe, el control queda marcado como inválido. */
  error?: string | string[];
  /** Indica que hay un <FieldDescription> para enlazarlo al control. */
  described?: boolean;
};

/**
 * Agrupa etiqueta, control, ayuda y error con los atributos de accesibilidad
 * conectados (id, aria-describedby, aria-invalid).
 */
function Field({ className, error, described = false, children, ...props }: FieldProps) {
  const id = React.useId();
  const message = Array.isArray(error) ? error[0] : error;
  const value: FieldContextValue = {
    controlId: `${id}-control`,
    descriptionId: `${id}-description`,
    errorId: `${id}-error`,
    hasDescription: described,
    invalid: Boolean(message),
  };

  return (
    <FieldContext.Provider value={value}>
      <div data-slot="field" className={cn("grid gap-2", className)} {...props}>
        {children}
        {message && (
          <p id={value.errorId} role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

function FieldLabel({
  className,
  optional,
  children,
  ...props
}: React.ComponentProps<typeof Label> & { optional?: boolean }) {
  const { controlId } = useField();
  return (
    <Label htmlFor={controlId} className={cn("font-semibold", className)} {...props}>
      {children}
      {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
    </Label>
  );
}

/** Envuelve el control (Input, Textarea, Checkbox...) e inyecta id y atributos ARIA. */
function FieldControl(props: React.ComponentProps<typeof Slot.Root>) {
  const { controlId, descriptionId, errorId, hasDescription, invalid } = useField();
  const describedBy = [hasDescription && descriptionId, invalid && errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <Slot.Root
      id={controlId}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy || undefined}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descriptionId } = useField();
  return (
    <p id={descriptionId} className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export { Field, FieldControl, FieldDescription, FieldLabel };
