import { AlertTriangleIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";

/**
 * Página legal en borrador. Los datos entre corchetes ([RAZÓN SOCIAL], [NIT]...)
 * deben reemplazarse con la información real del negocio, y el texto debe
 * revisarlo un abogado antes de publicar la tienda.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main id="contenido" className="container-page grid gap-6 py-8">
      <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: title }]} />
      <div className="grid max-w-3xl gap-6">
        <div className="grid gap-2">
          <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Última actualización: {updated}</p>
        </div>
        <p
          role="note"
          className="flex gap-2.5 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning"
        >
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Borrador pendiente de revisión legal. Los datos entre corchetes se completarán con la
          información oficial del negocio.
        </p>
        <div className="grid gap-5 leading-relaxed text-muted-foreground [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:grid [&_ul]:gap-1.5">
          {children}
        </div>
      </div>
    </main>
  );
}
