import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { figtree, hanken, plex } from "@/app/admin/fonts";
import { Logo, LogoMark } from "@/components/layout/logo";
import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/layout/theme-switch";
import { signOut } from "@/features/auth/actions";
import type { AdminUser } from "@/features/auth/session";
import { initials } from "@/features/account/initials";
import type { TeamMember } from "@/features/account/team";
import type { AdminLiveData } from "@/features/admin-live/queries";
import { cn } from "@/lib/utils";
import { AdminNav } from "./admin-nav";
import { AdminPresenceProvider, PresenceDot, TeamPresence } from "./admin-presence";
import { CommandPalette } from "./command-palette";
import { AdminFrame, SidebarToggle } from "./sidebar";
import { AdminChat } from "./live/admin-chat";
import { AdminLiveProvider } from "./live/live-provider";
import { LiveToasts } from "./live/live-toasts";
import { NotificationBell } from "./live/notification-bell";

export function AdminShell({
  admin,
  team,
  live,
  pendingOrders,
  sidebarCollapsed,
  children,
}: {
  admin: AdminUser;
  team: TeamMember[];
  live: AdminLiveData;
  pendingOrders: number;
  /** Preferencia guardada del menú lateral contraído. */
  sidebarCollapsed: boolean;
  children: React.ReactNode;
}) {
  const name = admin.fullName ?? "Administrador";
  return (
    // El acento y la fuente salen de «Mi cuenta» (globals.css: data-admin-*).
    <AdminPresenceProvider self={{ id: admin.id, name, initials: initials(admin) }} team={team}>
      <AdminLiveProvider selfId={admin.id} team={team} initial={live}>
        <AdminFrame
          initialCollapsed={sidebarCollapsed}
          data-admin-accent={admin.accent}
          data-admin-font={admin.font}
          className={cn(
            "grid min-h-full flex-1 font-sans",
            plex.variable,
            figtree.variable,
            hanken.variable,
          )}
        >
          <aside
            id="admin-sidebar"
            className="min-w-0 border-t-3 border-b border-t-primary bg-sidebar lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0"
          >
            <div className="flex h-full flex-col gap-6 p-4 lg:overflow-x-hidden lg:overflow-y-auto lg:group-data-[collapsed=true]/shell:px-3">
              <div className="flex items-center justify-between gap-2 lg:group-data-[collapsed=true]/shell:justify-center">
                <span className="contents lg:group-data-[collapsed=true]/shell:hidden">
                  <Logo />
                  <span className="rounded bg-primary-soft px-1.5 py-1 text-eyebrow text-primary">
                    Admin
                  </span>
                </span>
                <Link
                  href="/"
                  aria-label={`${siteConfig.name}, ir a la tienda`}
                  className="hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring lg:group-data-[collapsed=true]/shell:block"
                >
                  <LogoMark className="size-9" />
                </Link>
              </div>
              <AdminNav pendingOrders={pendingOrders} />
              <div className="mt-auto hidden gap-1 border-t pt-4 lg:grid">
                <SidebarToggle />
                <Link
                  href="/admin/cuenta"
                  title={name}
                  className="flex min-w-0 items-center gap-3 rounded-xl p-2 transition-colors hover:bg-foreground/[0.04] lg:group-data-[collapsed=true]/shell:justify-center lg:group-data-[collapsed=true]/shell:px-0"
                >
                  <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground [--presence-ring:var(--sidebar)]">
                    {initials(admin)}
                    <PresenceDot userId={admin.id} />
                  </span>
                  <span className="grid min-w-0 gap-0.5 lg:group-data-[collapsed=true]/shell:sr-only">
                    <span className="truncate text-sm font-semibold">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
                  </span>
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    title="Cerrar sesión"
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive lg:group-data-[collapsed=true]/shell:justify-center lg:group-data-[collapsed=true]/shell:px-0"
                  >
                    <span className="grid size-7 shrink-0 place-items-center">
                      <LogOutIcon className="size-4" aria-hidden />
                    </span>
                    <span className="lg:group-data-[collapsed=true]/shell:sr-only">
                      Cerrar sesión
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </aside>

          {/* Brillo suave del acento arriba del contenido: identifica el panel sin distraer. */}
          <div className="flex min-w-0 flex-col bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,color-mix(in_oklab,var(--primary)_9%,transparent),transparent)] bg-no-repeat">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-6">
              <CommandPalette />
              <div className="ml-auto flex items-center gap-3">
                <TeamPresence />
                <NotificationBell />
                {/* En el celular no cabe: el tema también se cambia en «Mi cuenta». */}
                <span className="hidden sm:contents">
                  <ThemeSwitch />
                </span>
              </div>
              <Link
                href="/admin/cuenta"
                aria-label="Mi cuenta"
                className="relative grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                {initials(admin)}
                <PresenceDot userId={admin.id} />
              </Link>
            </header>
            <main
              id="contenido"
              tabIndex={-1}
              className="mx-auto w-full max-w-[90rem] flex-1 p-4 outline-none md:p-6 lg:p-8"
            >
              {children}
            </main>
          </div>
          {/* Dentro del panel para tomar su color de acento y su fuente. */}
          <LiveToasts />
          <AdminChat />
        </AdminFrame>
      </AdminLiveProvider>
    </AdminPresenceProvider>
  );
}
