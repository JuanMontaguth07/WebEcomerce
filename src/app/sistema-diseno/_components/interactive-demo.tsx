"use client";

import { AnimatePresence, m } from "motion/react";
import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldControl, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Demostración de microinteracciones: agregar al carrito con estado de carga y confirmación. */
export function AddToCartDemo() {
  const [count, setCount] = useState(2);
  const [state, setState] = useState<"idle" | "loading" | "added">("idle");

  function handleAdd() {
    setState("loading");
    window.setTimeout(() => {
      setCount((value) => value + 1);
      setState("added");
      toast.success("Producto agregado al carrito", {
        description: "Tarjeta gráfica DEMO 12 GB",
      });
      window.setTimeout(() => setState("idle"), 1600);
    }, 600);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button onClick={handleAdd} isLoading={state === "loading"} disabled={state === "added"}>
        <AnimatePresence mode="wait" initial={false}>
          {state === "added" ? (
            <m.span
              key="added"
              className="inline-flex items-center gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <CheckIcon aria-hidden /> Agregado
            </m.span>
          ) : (
            <m.span
              key="idle"
              className="inline-flex items-center gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {state === "idle" && <ShoppingCartIcon aria-hidden />}
              {state === "loading" ? "Agregando…" : "Agregar al carrito"}
            </m.span>
          )}
        </AnimatePresence>
      </Button>

      <span className="relative inline-flex size-10 items-center justify-center rounded-lg border bg-card">
        <ShoppingCartIcon className="size-4" aria-hidden />
        <m.span
          key={count}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-primary px-1 text-center font-mono text-[0.6875rem] leading-5 text-primary-foreground tabular-nums"
        >
          {count}
        </m.span>
        <span className="sr-only">{count} productos en el carrito</span>
      </span>

      <Button
        variant="destructive"
        onClick={() =>
          toast.error("No hay unidades suficientes", {
            description: "Quedan 2 unidades de Memoria DEMO DDR5 32 GB.",
          })
        }
      >
        Simular error
      </Button>
    </div>
  );
}

/** Formulario de ejemplo con validación accesible (no envía datos). */
export function FormDemo() {
  const [email, setEmail] = useState("cliente@correo");
  const [consent, setConsent] = useState(false);
  const emailError = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    ? undefined
    : "Escribe un correo completo, por ejemplo nombre@dominio.com.";

  return (
    <form className="grid gap-5" onSubmit={(event) => event.preventDefault()} noValidate>
      <Field described>
        <FieldLabel>Teléfono</FieldLabel>
        <FieldControl>
          <Input type="tel" inputMode="tel" autoComplete="tel" defaultValue="300 123 4567" />
        </FieldControl>
        <FieldDescription>Lo usamos solo para coordinar la entrega.</FieldDescription>
      </Field>

      <Field error={emailError}>
        <FieldLabel>Correo electrónico</FieldLabel>
        <FieldControl>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FieldControl>
      </Field>

      <Field>
        <FieldLabel optional>Indicaciones de entrega</FieldLabel>
        <FieldControl>
          <Textarea placeholder="Torre, apartamento, horario preferido…" />
        </FieldControl>
      </Field>

      <Field>
        <div className="flex items-start gap-3">
          <FieldControl>
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              className="mt-0.5"
            />
          </FieldControl>
          <FieldLabel className="leading-snug font-normal">
            Autorizo el tratamiento de mis datos personales para gestionar mi pedido.
          </FieldLabel>
        </div>
      </Field>
    </form>
  );
}
