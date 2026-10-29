import { DownloadIcon, FileSpreadsheetIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/session";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Importar productos" };

const TIPS = [
  "El SKU identifica cada producto: si ya existe se actualiza, si no se crea.",
  "Para un producto nuevo hacen falta Producto, Categoría y Precio.",
  "Una celda vacía no borra nada: deja igual lo que ya tenía.",
  "Stock es la cantidad total que quieres tener (queda registrado como movimiento).",
  "La ficha técnica va en columnas «Ficha: Núcleos», «Ficha: Socket»…",
  "Lo nuevo entra oculto si la columna Visible está vacía. Las fotos se suben luego en cada producto.",
];

export default async function ImportProductsPage() {
  await requireAdmin("/admin/productos/importar");

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Importar productos"
        description="Sube un CSV (por ejemplo, el que exportas y editas en Excel). Antes de aplicar ves qué se crea y qué cambia."
        back={{ href: "/admin/productos", label: "Productos" }}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/admin/productos/plantilla" prefetch={false}>
                <FileSpreadsheetIcon aria-hidden />
                Descargar plantilla
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/productos/exportar" prefetch={false}>
                <DownloadIcon aria-hidden />
                Exportar catálogo
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ImportWizard />
        <aside
          aria-labelledby="como-importar"
          className="grid gap-3 rounded-2xl border bg-card p-5 text-sm"
        >
          <h2 id="como-importar" className="font-bold">
            Cómo funciona
          </h2>
          <ul className="grid list-disc gap-2 pl-4 text-muted-foreground marker:text-primary">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          <p className="border-t pt-3 text-xs text-muted-foreground">
            En Excel:{" "}
            <strong className="text-foreground">Archivo → Guardar como → CSV UTF-8</strong>. Se
            aceptan separadores punto y coma o coma, y hasta 1.000 productos por archivo.
          </p>
        </aside>
      </div>
    </div>
  );
}
