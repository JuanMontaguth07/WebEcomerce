import { ExternalLinkIcon, LayoutDashboardIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import type { AdminUser } from "@/features/auth/session";

// Solo se listan secciones ya implementadas (las demás llegan en la Fase 6).
const NAV = [{ href: "/admin", label: "Resumen", Icon: LayoutDashboardIcon }] as const;

export function AdminShell({ admin, children }: { admin: AdminUser; children: React.ReactNode }) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[15rem_1fr]">
      <aside className="border-b bg-sidebar lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between gap-2">
            <Logo />
            <span className="rounded bg-primary-soft px-1.5 py-1 text-eyebrow text-primary">
              Admin
            </span>
          </div>
          <nav aria-label="Panel" className="flex gap-1 lg:flex-col">
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md bg-secondary px-3 py-2 text-sm font-semibold"
                aria-current="page"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ExternalLinkIcon className="size-4" aria-hidden />
              Ver tienda
              <span className="sr-only">(se abre en otra pestaña)</span>
            </Link>
          </nav>
          <div className="mt-auto hidden gap-3 border-t pt-4 lg:grid">
            <div className="grid min-w-0 gap-0.5">
              <span className="truncate text-sm font-semibold">
                {admin.fullName ?? "Administrador"}
              </span>
              <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-end gap-2 border-b bg-card px-4 md:px-6">
          <span className="mr-auto truncate text-sm text-muted-foreground lg:hidden">
            {admin.email}
          </span>
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOutIcon aria-hidden />
              Cerrar sesión
            </Button>
          </form>
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
