import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { figtree, plex } from "@/app/admin/fonts";
import { Logo } from "@/components/layout/logo";
import { ThemeSwitch } from "@/components/layout/theme-switch";
import { signOut } from "@/features/auth/actions";
import type { AdminUser } from "@/features/auth/session";
import { initials } from "@/features/account/initials";
import { cn } from "@/lib/utils";
import { AdminNav } from "./admin-nav";
import { CommandPalette } from "./command-palette";

export function AdminShell({
  admin,
  pendingOrders,
  children,
}: {
  admin: AdminUser;
  pendingOrders: number;
  children: React.ReactNode;
}) {
  return (
    // El acento y la fuente salen de «Mi cuenta» (globals.css: data-admin-*).
    <div
      data-admin-accent={admin.accent}
      data-admin-font={admin.font}
      className={cn(
        "grid min-h-full flex-1 font-sans lg:grid-cols-[15rem_1fr]",
        plex.variable,
        figtree.variable,
      )}
    >
      <aside className="border-t-3 border-b border-t-primary bg-sidebar lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between gap-2">
            <Logo />
            <span className="rounded bg-primary-soft px-1.5 py-1 text-eyebrow text-primary">
              Admin
            </span>
          </div>
          <AdminNav pendingOrders={pendingOrders} />
          <div className="mt-auto hidden gap-2 border-t pt-4 lg:grid">
            <Link
              href="/admin/cuenta"
              className="flex min-w-0 items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">
                {initials(admin)}
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-sm font-semibold">
                  {admin.fullName ?? "Administrador"}
                </span>
                <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
              </span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <LogOutIcon className="size-4" aria-hidden />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Brillo suave del acento arriba del contenido: identifica el panel sin distraer. */}
      <div className="flex min-w-0 flex-col bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,color-mix(in_oklab,var(--primary)_9%,transparent),transparent)] bg-no-repeat">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-6">
          <CommandPalette />
          <ThemeSwitch className="ml-auto" />
          <Link
            href="/admin/cuenta"
            aria-label="Mi cuenta"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {initials(admin)}
          </Link>
        </header>
        <div className="mx-auto w-full max-w-[90rem] flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
