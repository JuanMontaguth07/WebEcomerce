import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Marco común de las pantallas de acceso al panel. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="contenido" className="relative grid min-h-full flex-1 place-items-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="grid w-full max-w-sm gap-8">
        <div className="grid justify-items-center gap-4 text-center">
          <Logo />
          <div className="grid gap-1">
            <h1 className="text-2xl font-extrabold font-stretch-112%">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-card">{children}</div>
        <div className="grid justify-items-center gap-2 text-sm text-muted-foreground">
          {footer}
          <Link href="/" className="hover:underline">
            Volver a la tienda
          </Link>
        </div>
      </div>
    </main>
  );
}
