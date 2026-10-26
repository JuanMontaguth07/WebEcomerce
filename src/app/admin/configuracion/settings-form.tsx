"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SparklesIcon } from "lucide-react";
import { CheckboxField, TextField } from "@/components/admin/form-helpers";
import { Button } from "@/components/ui/button";
import { updateStoreSettings } from "@/features/store-settings/actions";
import type { StoreSettingsInput } from "@/features/store-settings/schemas";

type Errors = Partial<Record<string, string[]>>;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6">
      <legend className="px-1 text-lg font-bold">{title}</legend>
      <p className="-mt-2 text-sm text-muted-foreground">{description}</p>
      {children}
    </fieldset>
  );
}

export function SettingsForm({ initial }: { initial: StoreSettingsInput }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  type TextKey = Exclude<keyof StoreSettingsInput, "announcementEnabled">;
  const field = (key: TextKey) => ({
    name: key,
    errors,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
      setErrors((current) => ({ ...current, [key]: undefined }));
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateStoreSettings(values);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setErrors({});
      toast.success("Configuración guardada. La tienda ya muestra los cambios.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <Section
        title="Anuncio de la tienda"
        description="Una barra llamativa arriba de todas las páginas: ofertas, envíos, nuevas rarezas…"
      >
        <TextField
          {...field("announcementText")}
          label="Texto"
          optional
          maxLength={140}
          placeholder="Hasta 20 % de descuento en tarjetas gráficas esta semana"
          hint={`${values.announcementText.length}/140`}
        />
        <TextField
          {...field("announcementHref")}
          label="Enlace"
          optional
          placeholder="/productos?oferta=1"
          hint="Ruta de la tienda que abre al tocar la barra: /productos?oferta=1, /rarezas, /categorias/…"
        />
        <CheckboxField
          name="announcementEnabled"
          label="Mostrar el anuncio"
          hint="Apágalo cuando termine la promoción; el texto queda guardado."
          checked={values.announcementEnabled}
          onCheckedChange={(checked) => {
            setValues((current) => ({ ...current, announcementEnabled: checked }));
            setErrors((current) => ({ ...current, announcementText: undefined }));
          }}
        />
        {values.announcementText && (
          <div className="grid gap-2">
            <span className="text-sm font-semibold">Vista previa</span>
            <div
              aria-hidden
              className="announcement-shine flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              <SparklesIcon className="size-4 shrink-0" />
              {values.announcementText}
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Contacto"
        description="Se muestran en el botón de WhatsApp, la página de Soporte y el pie de página. Lo que dejes vacío no aparece."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            {...field("whatsappNumber")}
            label="WhatsApp"
            optional
            inputMode="tel"
            placeholder="300 123 4567"
            hint="Celular de 10 dígitos o número con indicativo. Activa el botón flotante."
          />
          <TextField
            {...field("supportEmail")}
            label="Correo de atención"
            optional
            type="email"
            inputMode="email"
            placeholder="ventas@…"
          />
        </div>
        <TextField
          {...field("supportHours")}
          label="Horario de atención"
          optional
          maxLength={200}
          placeholder="Lunes a viernes de 8:00 a. m. a 6:00 p. m."
        />
      </Section>

      <Section
        title="Pagos por Nequi"
        description="Al terminar la compra, el cliente ve el valor a pagar, este número y un botón para enviarte el comprobante por WhatsApp. Confirma el pedido en el panel cuando recibas el pago."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            {...field("nequiNumber")}
            label="Número de Nequi"
            optional
            inputMode="tel"
            placeholder="300 123 4567"
          />
          <TextField
            {...field("nequiHolder")}
            label="Titular de la cuenta"
            optional
            maxLength={120}
            hint="Así el cliente confirma que transfiere a la persona correcta."
          />
        </div>
      </Section>

      <Section
        title="Datos legales"
        description="La Ley 1480 exige mostrar quién vende: aparecen en Soporte, en el pie de página y en los textos legales. Son públicos."
      >
        <TextField
          {...field("legalName")}
          label="Nombre o razón social"
          optional
          maxLength={200}
          hint="Persona natural: tu nombre completo tal como aparece en el RUT."
        />
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <TextField
            {...field("legalNit")}
            label="NIT"
            optional
            inputMode="numeric"
            hint="Sin el dígito de verificación. Persona natural: tu número de cédula."
          />
          <TextField {...field("legalDv")} label="DV" optional inputMode="numeric" maxLength={1} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            {...field("legalAddress")}
            label="Dirección de notificación"
            optional
            maxLength={200}
          />
          <TextField {...field("legalCity")} label="Ciudad" optional maxLength={100} />
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <Button type="submit" size="lg" isLoading={pending}>
          Guardar configuración
        </Button>
      </div>
    </form>
  );
}
