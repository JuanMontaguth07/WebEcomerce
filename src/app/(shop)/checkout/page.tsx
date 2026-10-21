import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main id="contenido" className="container-page grid gap-6 py-8">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Carrito", href: "/carrito" },
          { name: "Finalizar compra" },
        ]}
      />
      <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">Finalizar compra</h1>
      <CheckoutForm />
    </main>
  );
}
