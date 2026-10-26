import { LogOutIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import type { AdminUser } from "@/features/auth/session";
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
    <div className="grid min-h-full flex-1 lg:grid-cols-[15rem_1fr]">
      <aside className="border-b bg-sidebar lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between gap-2">
            <Logo />
            <span className="rounded bg-primary-soft px-1.5 py-1 text-eyebrow text-primary">
              Admin
            </span>
          </div>
          <AdminNav pendingOrders={pendingOrders} />
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-2 border-b bg-card/90 px-4 backdrop-blur md:px-6">
          <CommandPalette />
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
