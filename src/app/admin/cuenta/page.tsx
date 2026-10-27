import { LogOutIcon } from "lucide-react";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/features/account/initials";
import { signOut } from "@/features/auth/actions";
import { requireAdmin } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppearanceForm, PasswordForm, ProfileForm } from "./account-forms";

export const metadata: Metadata = { title: "Mi cuenta" };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Administradores de la tienda (RLS: un admin ve todos los perfiles). */
async function listAdmins() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "admin")
    .order("created_at");
  if (error) throw error;
  return data;
}

export default async function AccountPage() {
  const admin = await requireAdmin("/admin/cuenta");
  const admins = await listAdmins();

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <AdminPageHeader
        title="Mi cuenta"
        description="Tu perfil, tu contraseña y cómo se ve el panel para ti."
      />

      <Section title="Perfil">
        <ProfileForm initialName={admin.fullName ?? ""} email={admin.email ?? ""} />
      </Section>

      <Section
        title="Apariencia del panel"
        description="El color y la fuente se guardan en tu cuenta y no cambian la tienda ni la vista del otro administrador."
      >
        <AppearanceForm accent={admin.accent} font={admin.font} />
      </Section>

      <Section title="Contraseña" description="Por seguridad te pedimos la actual.">
        <PasswordForm />
      </Section>

      <Section title="Administradores">
        <ul className="grid gap-2">
          {admins.map((person) => (
            <li
              key={person.id}
              className="flex items-center gap-3 rounded-lg border bg-background p-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                {initials({ fullName: person.full_name, email: person.email })}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-semibold">{person.full_name ?? "Sin nombre"}</span>
                <span className="truncate text-xs text-muted-foreground">{person.email}</span>
              </span>
              {person.id === admin.id && <Badge variant="soft">Tú</Badge>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Sesión" description="Cierra la sesión en este navegador.">
        <form action={signOut}>
          <Button type="submit" variant="destructive" className="w-fit">
            <LogOutIcon aria-hidden />
            Cerrar sesión
          </Button>
        </form>
      </Section>
    </div>
  );
}
