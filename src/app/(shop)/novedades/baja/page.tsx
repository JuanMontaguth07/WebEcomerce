import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = {
  title: "Darse de baja de las novedades",
  robots: { index: false },
};

export default function UnsubscribePage() {
  return (
    <main id="contenido" className="container-page grid max-w-3xl gap-6 py-10">
      <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Darse de baja" }]} />
      <div className="grid gap-2">
        <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">
          Darse de baja de las novedades
        </h1>
        <p className="text-muted-foreground">
          Escribe el correo con el que te suscribiste y dejamos de enviarte novedades. Si quieres
          que borremos tus datos por completo, escríbenos como indica la{" "}
          <Link href="/privacidad" className="font-semibold text-primary hover:underline">
            política de tratamiento de datos
          </Link>
          .
        </p>
      </div>
      <UnsubscribeForm />
    </main>
  );
}
