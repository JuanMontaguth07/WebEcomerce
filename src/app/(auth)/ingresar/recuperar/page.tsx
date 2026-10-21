import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { ResetRequestForm } from "./reset-request-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export default function ResetRequestPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Te enviaremos un enlace para crear una contraseña nueva."
      footer={
        <Link href="/ingresar" className="font-semibold text-primary hover:underline">
          Volver a ingresar
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthCard>
  );
}
