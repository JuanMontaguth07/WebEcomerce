import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/features/auth/session";
import { AuthCard } from "../auth-card";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

/** Solo accesible con la sesión temporal que crea el enlace del correo. */
async function Gate() {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar?error=enlace-invalido");
  return <NewPasswordForm />;
}

export default function NewPasswordPage() {
  return (
    <AuthCard title="Crea una contraseña nueva" description="La usarás para entrar al panel.">
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <Gate />
      </Suspense>
    </AuthCard>
  );
}
