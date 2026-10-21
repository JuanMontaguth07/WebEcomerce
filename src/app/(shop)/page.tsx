import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/config/site";

// Página provisional. La home real se construye en la Fase 3.
export default function HomePage() {
  return (
    <>
      <header className="border-b bg-card">
        <div className="container-page flex h-16 items-center justify-between">
          <span className="font-heading text-base font-extrabold font-stretch-125%">
            {siteConfig.name}
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main id="contenido" className="container-page flex flex-1 flex-col justify-center py-24">
        <div className="grid max-w-3xl gap-4">
          <p className="text-eyebrow text-muted-foreground">En construcción</p>
          <h1 className="text-4xl font-extrabold font-stretch-125% md:text-5xl">
            {siteConfig.shortDescription}
          </h1>
          <p className="text-lg text-muted-foreground">
            Estamos preparando el catálogo. Muy pronto podrás comprar aquí.
          </p>
        </div>
      </main>
    </>
  );
}
