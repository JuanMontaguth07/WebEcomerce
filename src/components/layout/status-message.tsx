import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Mensaje de estado a página completa (404, error), con acciones claras. */
export function StatusMessage({
  code,
  title,
  description,
  children,
}: {
  code: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <main
      id="contenido"
      className="container-page grid flex-1 place-items-center py-20 text-center"
    >
      <div className="grid max-w-md justify-items-center gap-4">
        <span className="font-mono text-sm text-primary">{code}</span>
        <h1 className="text-3xl font-extrabold font-stretch-112% md:text-4xl">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {children ?? (
            <>
              <Button asChild>
                <Link href="/productos">Ver catálogo</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/">Ir al inicio</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
