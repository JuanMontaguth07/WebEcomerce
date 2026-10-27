"use client";

import { CheckIcon, MonitorIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { figtree, hanken, plex } from "@/app/admin/fonts";
import { TextField } from "@/components/admin/form-helpers";
import { ThemeSwitch } from "@/components/layout/theme-switch";
import { useChangeTheme } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { changePassword, updateAdminPreferences, updateProfile } from "@/features/account/actions";
import {
  ADMIN_ACCENT_KEYS,
  ADMIN_ACCENTS,
  ADMIN_FONT_KEYS,
  ADMIN_FONTS,
  type AdminAccent,
  type AdminFont,
} from "@/features/account/preferences";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<string, string[]>>;

// Dentro del panel --font-body apunta a la fuente elegida: la muestra usa la familia real.
const FONT_PREVIEW: Record<AdminFont, string> = {
  plex: plex.style.fontFamily,
  figtree: figtree.style.fontFamily,
  hanken: hanken.style.fontFamily,
};

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateProfile({ fullName: name });
          if (!result.ok) {
            setErrors(result.error.fieldErrors ?? {});
            toast.error(result.error.message);
            return;
          }
          setErrors({});
          toast.success("Nombre actualizado");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="fullName"
          label="Nombre"
          errors={errors}
          maxLength={120}
          autoComplete="name"
          hint="Así apareces en la actividad y en los pedidos."
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors({});
          }}
        />
        <TextField
          name="email"
          label="Correo"
          errors={{}}
          value={email}
          readOnly
          hint="Es tu usuario para entrar. Se cambia desde Supabase."
          className="[&_input]:text-muted-foreground"
        />
      </div>
      <Button type="submit" className="w-fit" isLoading={pending} disabled={name === initialName}>
        Guardar nombre
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [values, setValues] = useState({ current: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const field = (key: keyof typeof values) => ({
    name: key,
    errors,
    type: "password",
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
      setErrors((current) => ({ ...current, [key]: undefined }));
    },
  });

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await changePassword(values);
          if (!result.ok) {
            setErrors(result.error.fieldErrors ?? {});
            toast.error(result.error.message);
            return;
          }
          setErrors({});
          setValues({ current: "", password: "", confirm: "" });
          toast.success("Contraseña cambiada");
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          {...field("current")}
          label="Contraseña actual"
          autoComplete="current-password"
        />
        <TextField
          {...field("password")}
          label="Nueva contraseña"
          autoComplete="new-password"
          hint="10+ caracteres con mayúsculas, minúsculas y números."
        />
        <TextField {...field("confirm")} label="Repite la nueva" autoComplete="new-password" />
      </div>
      <Button
        type="submit"
        variant="secondary"
        className="w-fit"
        isLoading={pending}
        disabled={!values.current || !values.password}
      >
        Cambiar contraseña
      </Button>
    </form>
  );
}

/**
 * Tema, color de acento y fuente del panel. El acento y la fuente se guardan
 * al elegirlos y solo cambian la vista de este administrador.
 */
export function AppearanceForm({ accent, font }: { accent: AdminAccent; font: AdminFont }) {
  const router = useRouter();
  const { theme, changeTheme } = useChangeTheme();
  const [choice, setChoice] = useState({ accent, font });
  const [pending, startTransition] = useTransition();

  function save(next: { accent: AdminAccent; font: AdminFont }) {
    const previous = choice;
    setChoice(next);
    startTransition(async () => {
      const result = await updateAdminPreferences(next);
      if (!result.ok) {
        setChoice(previous);
        toast.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-0.5">
          <span className="font-semibold">Modo</span>
          <span className="text-sm text-muted-foreground">
            {theme === "system"
              ? "Sigue el modo de tu dispositivo."
              : "Elegido por ti en este navegador."}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeSwitch showLabel />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={theme === "system"}
            onClick={() => changeTheme("system")}
            className="aria-pressed:bg-primary-soft aria-pressed:text-primary"
          >
            <MonitorIcon aria-hidden />
            Usar el del sistema
          </Button>
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-3 font-semibold">Color del panel</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ADMIN_ACCENT_KEYS.map((key) => {
            const selected = choice.accent === key;
            return (
              <label
                key={key}
                className={cn(
                  "relative grid cursor-pointer justify-items-center gap-2 rounded-xl border bg-background p-3 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                  selected ? "border-primary bg-primary-soft font-semibold" : "hover:border-input",
                )}
              >
                <input
                  type="radio"
                  name="accent"
                  value={key}
                  checked={selected}
                  onChange={() => save({ ...choice, accent: key })}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-full text-white shadow-sm"
                  style={{ background: ADMIN_ACCENTS[key].swatch }}
                >
                  {selected && <CheckIcon className="size-4" />}
                </span>
                {ADMIN_ACCENTS[key].label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-3 font-semibold">Fuente del panel</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {ADMIN_FONT_KEYS.map((key) => {
            const selected = choice.font === key;
            return (
              <label
                key={key}
                style={{ fontFamily: FONT_PREVIEW[key] }}
                className={cn(
                  "grid cursor-pointer gap-1 rounded-xl border bg-background p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                  selected ? "border-primary bg-primary-soft" : "hover:border-input",
                )}
              >
                <input
                  type="radio"
                  name="font"
                  value={key}
                  checked={selected}
                  onChange={() => save({ ...choice, font: key })}
                  className="sr-only"
                />
                <span className="text-2xl font-semibold">Aa 123</span>
                <span className="font-semibold">{ADMIN_FONTS[key].label}</span>
                <span className="text-sm text-muted-foreground">{ADMIN_FONTS[key].hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
