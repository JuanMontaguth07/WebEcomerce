import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNextPath } from "@/features/auth/paths";
import { getAdminUser } from "@/features/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar al panel",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  "sin-permiso": "Tu cuenta no tiene acceso al panel de administración.",
};

async function LoginContent({ searchParams }: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  if (await getAdminUser()) redirect(next as Parameters<typeof redirect>[0]);

  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  return <LoginForm next={next} notice={errorKey ? NOTICES[errorKey] : undefined} />;
}

export default function LoginPage(props: PageProps<"/ingresar">) {
  return (
    <main id="contenido" className="relative grid min-h-full flex-1 place-items-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="grid w-full max-w-sm gap-8">
        <div className="grid justify-items-center gap-4 text-center">
          <Logo />
          <div className="grid gap-1">
            <h1 className="text-2xl font-extrabold font-stretch-112%">Panel de administración</h1>
            <p className="text-sm text-muted-foreground">Ingresa con tu cuenta de administrador.</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <Suspense
            fallback={
              <div className="grid gap-5" aria-busy>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            }
          >
            <LoginContent {...props} />
          </Suspense>
        </div>
        <Link
          href="/"
          className="justify-self-center text-sm text-muted-foreground hover:underline"
        >
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
