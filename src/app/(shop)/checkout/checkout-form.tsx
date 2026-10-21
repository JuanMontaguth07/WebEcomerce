"use client";

import { LockIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CartLines } from "@/components/cart/cart-lines";
import { CartSummary } from "@/components/cart/cart-summary";
import { useCartQuote } from "@/components/cart/use-cart-quote";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldControl, FieldDescription, FieldLabel } from "@/components/ui/field";
import { fieldBase, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/features/cart/store";
import { placeOrder } from "@/features/checkout/actions";
import { DEPARTMENTS } from "@/features/checkout/departments";
import { customerSchema } from "@/features/checkout/schemas";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<string, string[]>>;

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  document: "",
  department: "",
  city: "",
  address: "",
  notes: "",
};

export function CheckoutForm() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { quote, error: quoteError, refresh } = useCartQuote(items);
  const [form, setForm] = useState(EMPTY_FORM);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Tras crear el pedido se vacía el carrito; esto evita mostrar "carrito vacío" mientras se redirige.
  const [placed, setPlaced] = useState(false);

  // Al editar un campo desaparece su error: el cliente ve que lo corrigió.
  const clearError = (key: string) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormError(null);
  };

  const set =
    (key: keyof typeof EMPTY_FORM) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      clearError(key);
    };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const website = String(new FormData(event.currentTarget).get("website") ?? "");

    // Validación previa en el navegador; el servidor vuelve a validar todo.
    const local = customerSchema.safeParse({ ...form, dataConsent: consent });
    if (!local.success) {
      const next: FieldErrors = {};
      for (const issue of local.error.issues) {
        const key = String(issue.path[0]);
        next[key] = [...(next[key] ?? []), issue.message];
      }
      setErrors(next);
      setFormError("Revisa los campos marcados.");
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await placeOrder({
        customer: { ...form, dataConsent: consent },
        items,
        website,
      });

      if (result.ok) {
        setPlaced(true);
        clear();
        toast.success(`Pedido #${result.data.orderNumber} recibido`);
        router.replace(`/pedido/${result.data.orderId}?t=${result.data.accessToken}` as Route);
        return;
      }

      // Si cambió el stock mientras se llenaba el formulario, se vuelve a cotizar
      // para mostrar qué productos ajustar (los datos escritos se conservan).
      if (["OUT_OF_STOCK", "PRODUCT_UNAVAILABLE"].includes(result.error.code)) refresh();
      if (result.error.fieldErrors) setErrors(result.error.fieldErrors);
      setFormError(result.error.message);
      toast.error(result.error.message);
    });
  }

  if (placed) {
    return (
      <p
        role="status"
        className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground"
      >
        Pedido recibido. Abriendo la confirmación…
      </p>
    );
  }

  if (!items.length) {
    return (
      <div className="grid justify-items-center gap-4 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
        <h2 className="text-lg font-semibold">No hay productos para comprar</h2>
        <p className="text-sm text-muted-foreground">Agrega productos al carrito para continuar.</p>
        <Button asChild>
          <Link href="/productos">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  const canSubmit = Boolean(quote?.ready) && !pending;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid items-start gap-8 lg:grid-cols-[1fr_24rem]"
    >
      <div className="grid gap-8">
        {/* Campo trampa para bots: oculto a personas y lectores de pantalla. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
          <label htmlFor="website">No completar</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <fieldset className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6">
          <legend className="px-1 text-lg font-bold">Tus datos</legend>
          <Field error={errors.name}>
            <FieldLabel>Nombre completo</FieldLabel>
            <FieldControl>
              <Input value={form.name} onChange={set("name")} autoComplete="name" required />
            </FieldControl>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errors.email}>
              <FieldLabel>Correo electrónico</FieldLabel>
              <FieldControl>
                <Input
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                  required
                />
              </FieldControl>
            </Field>
            <Field error={errors.phone} described>
              <FieldLabel>Teléfono / celular</FieldLabel>
              <FieldControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  autoComplete="tel"
                  required
                />
              </FieldControl>
              <FieldDescription>Para coordinar la entrega.</FieldDescription>
            </Field>
          </div>
          <Field error={errors.document} described>
            <FieldLabel optional>Cédula o NIT</FieldLabel>
            <FieldControl>
              <Input value={form.document} onChange={set("document")} inputMode="numeric" />
            </FieldControl>
            <FieldDescription>
              Útil si necesitas factura a tu nombre o el de tu empresa.
            </FieldDescription>
          </Field>
        </fieldset>

        <fieldset className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6">
          <legend className="px-1 text-lg font-bold">Entrega</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errors.department}>
              <FieldLabel>Departamento</FieldLabel>
              <FieldControl>
                <select
                  value={form.department}
                  onChange={set("department")}
                  autoComplete="address-level1"
                  required
                  className={cn(fieldBase, "h-10 px-3")}
                >
                  <option value="" disabled>
                    Selecciona…
                  </option>
                  {DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </FieldControl>
            </Field>
            <Field error={errors.city}>
              <FieldLabel>Ciudad o municipio</FieldLabel>
              <FieldControl>
                <Input
                  value={form.city}
                  onChange={set("city")}
                  autoComplete="address-level2"
                  required
                />
              </FieldControl>
            </Field>
          </div>
          <Field error={errors.address} described>
            <FieldLabel>Dirección</FieldLabel>
            <FieldControl>
              <Input
                value={form.address}
                onChange={set("address")}
                autoComplete="street-address"
                required
              />
            </FieldControl>
            <FieldDescription>Incluye barrio, torre o apartamento si aplica.</FieldDescription>
          </Field>
          <Field error={errors.notes}>
            <FieldLabel optional>Indicaciones de entrega</FieldLabel>
            <FieldControl>
              <Textarea
                value={form.notes}
                onChange={set("notes")}
                maxLength={500}
                placeholder="Horario preferido, punto de referencia…"
              />
            </FieldControl>
          </Field>
        </fieldset>
      </div>

      <aside
        aria-label="Resumen del pedido"
        className="grid gap-5 rounded-xl border bg-card p-5 lg:sticky lg:top-32"
      >
        <h2 className="text-lg font-bold">Tu pedido</h2>
        <CartLines items={items} quote={quote} compact />
        {quoteError && (
          <p role="alert" className="text-sm text-destructive">
            {quoteError}
          </p>
        )}
        <CartSummary quote={quote} />

        <Field error={errors.dataConsent}>
          <div className="flex items-start gap-3">
            <FieldControl>
              <Checkbox
                checked={consent}
                onCheckedChange={(value) => {
                  setConsent(value === true);
                  clearError("dataConsent");
                }}
                className="mt-0.5"
              />
            </FieldControl>
            <FieldLabel className="leading-snug font-normal">
              <span>
                Autorizo el tratamiento de mis datos personales según la{" "}
                <Link
                  href="/privacidad"
                  target="_blank"
                  className="font-semibold text-primary underline"
                >
                  política de privacidad
                </Link>{" "}
                y acepto los{" "}
                <Link
                  href="/terminos"
                  target="_blank"
                  className="font-semibold text-primary underline"
                >
                  términos y condiciones
                </Link>
                .
              </span>
            </FieldLabel>
          </div>
        </Field>

        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {formError}
          </p>
        )}
        {quote && !quote.ready && (
          <p className="text-sm text-warning" role="status">
            Ajusta los productos marcados para continuar.
          </p>
        )}

        <Button type="submit" size="lg" disabled={!canSubmit} isLoading={pending}>
          {!pending && <LockIcon aria-hidden />}
          {pending ? "Enviando pedido…" : "Confirmar pedido"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Al confirmar, reservamos las unidades y te contactamos para coordinar pago y envío. Aún no
          se realiza ningún cobro en línea.
        </p>
      </aside>
    </form>
  );
}
