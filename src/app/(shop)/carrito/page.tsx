import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <main id="contenido" className="container-page grid gap-6 py-8">
      <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Carrito" }]} />
      <h1 className="text-3xl font-extrabold font-stretch-125% md:text-4xl">Tu carrito</h1>
      <CartView />
    </main>
  );
}
