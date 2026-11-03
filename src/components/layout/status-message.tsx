import { KoviLive } from "@/components/mascot/kovi-live";
import type { MascotMood } from "@/features/mascot/store";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Mensaje de estado a página completa (404, error), con acciones claras. */
export function StatusMessage({
  code,
  title,
  description,
  mood,
  children,
}: {
  code: string;
  /** Kovi acompaña el mensaje con ese gesto (sin él, solo el texto). */
  mood?: MascotMood;
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
        {mood && <KoviLive mood={mood} className="w-28" />}
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
