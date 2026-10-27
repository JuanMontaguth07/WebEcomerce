import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Configurator } from "@/components/architect/configurator";
import { ConfiguratorSkeleton } from "@/components/architect/configurator-skeleton";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { indexParts } from "@/features/architect/build";
import { demoArchitectParts } from "@/features/architect/parts";
import { getArchitectParts, getSavedBuild } from "@/features/architect/queries";
import { restoreSelection } from "@/features/architect/saved";
import { getStoreSettings } from "@/features/store-settings/queries";
import { formatCOP } from "@/lib/format";

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export async function generateMetadata({
  params,
}: PageProps<"/arma-tu-pc/[code]">): Promise<Metadata> {
  const { code } = await params;
  const build = await getSavedBuild(code);
  return {
    title: build ? `«${build.name}» · Arma tu PC` : "Configuración no encontrada",
    description: build
      ? `Configuración de PC guardada en Arma tu PC: ${build.components.length} piezas, ${formatCOP(build.total)}.`
      : undefined,
    // Los enlaces se comparten a mano: no son páginas para buscadores.
    robots: { index: false, follow: false },
  };
}

async function SavedBuildContent({ params }: PageProps<"/arma-tu-pc/[code]">) {
  const { code } = await params;
  const [build, catalogParts, settings] = await Promise.all([
    getSavedBuild(code),
    getArchitectParts(),
    getStoreSettings(),
  ]);
  if (!build) notFound();

  const demoParts = demoArchitectParts();
  const restored = restoreSelection(
    build,
    indexParts(build.source === "demo" ? demoParts : catalogParts),
  );
  const notices = [
    ...(restored.missing.length
      ? [
          `${restored.missing.length === 1 ? "Esta pieza ya no está" : "Estas piezas ya no están"} en el catálogo: ${restored.missing.join(", ")}. Elige un reemplazo.`,
        ]
      : []),
    ...restored.priceChanges.map(
      (change) =>
        `${change.name} cambió de precio: ${formatCOP(change.before)} al guardar, ${formatCOP(change.now)} hoy.`,
    ),
  ];

  return (
    <>
      <header className="grid gap-3">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Arma tu PC", href: "/arma-tu-pc" },
            { name: build.name },
          ]}
        />
        <p className="text-eyebrow text-primary">Configuración guardada</p>
        <h1 className="text-4xl leading-[1.05] font-extrabold font-stretch-125% md:text-5xl">
          {build.name}
        </h1>
        <p className="text-muted-foreground">
          Guardada el {dateFormat.format(new Date(build.created_at))} · {formatCOP(build.total)} al
          guardarla. Puedes ajustarla: al guardar se crea una versión nueva y esta no cambia.
        </p>
      </header>
      {notices.length > 0 && (
        <ul className="grid gap-2">
          {notices.map((notice) => (
            <li
              key={notice}
              className="flex gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm"
            >
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              {notice}
            </li>
          ))}
        </ul>
      )}
      <Configurator
        catalogParts={catalogParts}
        demoParts={demoParts}
        whatsappNumber={settings.whatsappNumber}
        initial={{
          mode: "free",
          source: build.source,
          selection: restored.selection,
          active: "cpu",
          budget: build.budget,
          parent: { code: build.code, name: build.name },
        }}
      />
    </>
  );
}

export default function SavedBuildPage(props: PageProps<"/arma-tu-pc/[code]">) {
  return (
    <main id="contenido" className="container-page grid gap-8 py-8 md:py-10">
      <Suspense
        fallback={
          <div className="grid gap-6" aria-busy>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-12 w-80" />
            <ConfiguratorSkeleton />
          </div>
        }
      >
        <SavedBuildContent {...props} />
      </Suspense>
    </main>
  );
}
