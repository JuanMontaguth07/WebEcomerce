"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldControl, FieldDescription, FieldLabel } from "@/components/ui/field";
import { fieldBase, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Campos de formulario del panel con etiqueta, ayuda y error conectados.
 * Mantienen los formularios cortos y consistentes.
 */

type Errors = Partial<Record<string, string[]>>;

type BaseProps = {
  name: string;
  label: string;
  errors: Errors;
  hint?: string;
  optional?: boolean;
  className?: string;
};

export function TextField({
  name,
  label,
  errors,
  hint,
  optional,
  className,
  ...input
}: BaseProps & Omit<React.ComponentProps<typeof Input>, "name">) {
  return (
    <Field error={errors[name]} described={Boolean(hint)} className={className}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <FieldControl>
        <Input name={name} {...input} />
      </FieldControl>
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}

export function TextAreaField({
  name,
  label,
  errors,
  hint,
  optional,
  className,
  ...input
}: BaseProps & Omit<React.ComponentProps<typeof Textarea>, "name">) {
  return (
    <Field error={errors[name]} described={Boolean(hint)} className={className}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <FieldControl>
        <Textarea name={name} {...input} />
      </FieldControl>
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}

export function SelectField({
  name,
  label,
  errors,
  hint,
  optional,
  className,
  options,
  ...select
}: BaseProps &
  Omit<React.ComponentProps<"select">, "name"> & {
    options: { value: string; label: string }[];
  }) {
  return (
    <Field error={errors[name]} described={Boolean(hint)} className={className}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <FieldControl>
        <select name={name} className={cn(fieldBase, "h-10 px-3")} {...select}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldControl>
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  checked,
  onCheckedChange,
  errors,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  errors?: Errors;
  disabled?: boolean;
}) {
  return (
    <Field error={errors?.[name]} described={Boolean(hint)}>
      <div className="flex items-start gap-3">
        <FieldControl>
          <Checkbox
            name={name}
            checked={checked}
            disabled={disabled}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            className="mt-0.5"
          />
        </FieldControl>
        <div className="grid gap-1">
          <FieldLabel className="font-semibold">{label}</FieldLabel>
          {hint && <FieldDescription>{hint}</FieldDescription>}
        </div>
      </div>
    </Field>
  );
}
