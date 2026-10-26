import { ChevronDownIcon, ClockIcon, MailIcon, MessageCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { PAYMENT_WINDOW_HOURS } from "@/components/support/store-fact";
import { getStoreSettings } from "@/features/store-settings/queries";
import { formatNit, formatPhone, whatsappLink } from "@/features/store-settings/types";
import { baseOpenGraph } from "@/lib/seo";

const description =
  "Contacto, horario de atención y respuestas sobre pagos, envíos, garantías y devoluciones.";

export const metadata: Metadata = {
  title: "Soporte",
  description,
  alternates: { canonical: "/soporte" },
  openGraph: {
    ...baseOpenGraph,
    title: `Soporte · ${siteConfig.name}`,
    description,
    url: "/soporte",
  },
};

// Solo describen cómo funciona hoy la tienda (sin promesas comerciales no definidas).
const paymentAnswer = (nequi: boolean) =>
  nequi
    ? `Por transferencia a Nequi. Al terminar la compra ves el valor exacto y el número; envíanos el comprobante y confirmamos tu pedido. Los productos quedan reservados para ti durante ${PAYMENT_WINDOW_HOURS} horas: si no recibimos el pago, el pedido se cancela automáticamente.`
    : `Al confirmar tu pedido te contactamos por WhatsApp o correo con los datos para el pago. Los productos quedan reservados para ti durante ${PAYMENT_WINDOW_HOURS} horas: si no recibimos el pago, el pedido se cancela automáticamente.`;

const FAQ: { question: string; answer: React.ReactNode }[] = [
  {
    question: "¿Cuánto cuesta el envío y cuánto tarda?",
    answer:
      "Depende de tu departamento y ciudad: lo ves en el checkout antes de confirmar, junto con el tiempo estimado de entrega. Si tu ciudad aún no tiene tarifa, te confirmamos el valor antes de despachar.",
  },
  {
    question: "¿Cómo consulto el estado de mi pedido?",
    answer:
      "En la página de confirmación que ves al terminar la compra. Guarda ese enlace: con él puedes revisar el estado cuando quieras. Si lo perdiste, escríbenos con tu número de pedido.",
  },
  {
    question: "¿Qué garantía tienen los productos?",
    answer: (
      <>
        Cada producto indica su garantía en la ficha técnica. Consulta cómo hacerla efectiva en{" "}
        <Link href="/garantias" className="font-semibold text-primary hover:underline">
          Garantías
        </Link>
        .
      </>
    ),
  },
  {
    question: "¿Puedo devolver un producto?",
    answer: (
      <>
        Como es una compra a distancia, tienes derecho de retracto según la Ley 1480 de 2011. Revisa
        plazos y condiciones en{" "}
        <Link href="/retracto" className="font-semibold text-primary hover:underline">
          Derecho de retracto
        </Link>
        .
      </>
    ),
  },
  {
    question: "¿Cómo tratan mis datos personales?",
    answer: (
      <>
        Solo los usamos para gestionar tu pedido. Consulta la{" "}
        <Link href="/privacidad" className="font-semibold text-primary hover:underline">
          política de tratamiento de datos
        </Link>
        .
      </>
    ),
  },
];

function ContactCard({
  Icon,
  title,
  children,
}: {
  Icon: typeof MailIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-3 rounded-2xl border bg-card p-5 shadow-card">
      <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}

export default async function SupportPage() {
  const settings = await getStoreSettings();
  const nit = formatNit(settings);
  const address = [settings.legalAddress, settings.legalCity].filter(Boolean).join(", ");
  const hasContact = Boolean(
    settings.whatsappNumber || settings.supportEmail || settings.supportHours,
  );
  const legal = [
    { label: "Vendedor", value: settings.legalName },
    { label: "NIT", value: nit },
    { label: "Dirección", value: address || null },
    { label: "Correo", value: settings.supportEmail },
    {
      label: "Teléfono",
      value: settings.whatsappNumber ? formatPhone(settings.whatsappNumber) : null,
    },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <main id="contenido" className="grid gap-14 pb-8">
      <section className="relative overflow-hidden border-b bg-card dark:bg-background">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] size-[32rem] rounded-full bg-primary/15 blur-3xl dark:bg-primary/25"
        />
        <div className="relative container-page grid gap-5 py-12 md:py-16">
          <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Soporte" }]} />
          <p className="text-eyebrow text-primary">Soporte</p>
          <h1 className="max-w-3xl text-4xl leading-[1.05] font-extrabold font-stretch-125% md:text-5xl">
            ¿En qué te ayudamos?
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{description}</p>
        </div>
      </section>

      {hasContact && (
        <section aria-labelledby="contacto" className="container-page grid gap-6">
          <h2 id="contacto" className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
            <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-primary" />
            Contacto
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {settings.whatsappNumber && (
              <ContactCard Icon={MessageCircleIcon} title="WhatsApp">
                <p className="font-mono text-sm select-all">
                  {formatPhone(settings.whatsappNumber)}
                </p>
                <Button asChild className="w-fit">
                  <a
                    href={whatsappLink(
                      settings.whatsappNumber,
                      `Hola ${siteConfig.name}, necesito ayuda.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Escribir por WhatsApp
                  </a>
                </Button>
              </ContactCard>
            )}
            {settings.supportEmail && (
              <ContactCard Icon={MailIcon} title="Correo">
                <p className="text-sm break-all select-all">{settings.supportEmail}</p>
                <Button asChild variant="secondary" className="w-fit">
                  <a href={`mailto:${settings.supportEmail}`}>Enviar correo</a>
                </Button>
              </ContactCard>
            )}
            {settings.supportHours && (
              <ContactCard Icon={ClockIcon} title="Horario de atención">
                <p className="text-sm text-muted-foreground">{settings.supportHours}</p>
              </ContactCard>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="preguntas" className="container-page grid gap-6">
        <h2 id="preguntas" className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
          <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-primary" />
          Preguntas frecuentes
        </h2>
        <div className="grid max-w-4xl divide-y overflow-hidden rounded-2xl border bg-card">
          {[
            {
              question: "¿Cómo pago mi pedido?",
              answer: paymentAnswer(Boolean(settings.nequiNumber)),
            },
            ...FAQ,
          ].map((item) => (
            <details key={item.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold transition-colors hover:bg-secondary/60 [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDownIcon
                  className="size-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="px-5 pb-5 text-muted-foreground">{item.answer}</div>
            </details>
          ))}
        </div>
      </section>

      {legal.length > 0 && (
        <section aria-labelledby="vendedor" className="container-page grid gap-4">
          <h2 id="vendedor" className="text-eyebrow text-muted-foreground">
            Información del vendedor
          </h2>
          <dl className="grid max-w-4xl gap-x-8 gap-y-3 rounded-2xl border bg-card p-5 text-sm sm:grid-cols-2">
            {legal.map((item) => (
              <div key={item.label} className="grid gap-0.5">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            Información publicada en cumplimiento de la Ley 1480 de 2011 (Estatuto del Consumidor).{" "}
            <Link href="/terminos" className="hover:underline">
              Términos y condiciones
            </Link>
          </p>
        </section>
      )}
    </main>
  );
}
