import { cacheLife } from "next/cache";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getCategories } from "@/features/catalog/queries";
import { Logo } from "./logo";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export async function SiteFooter() {
  const categories = (await getCategories()).filter((category) => !category.parentId);

  return (
    <footer className="mt-24 border-t bg-card">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="grid max-w-sm content-start gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground">{siteConfig.shortDescription}</p>
        </div>

        <nav aria-labelledby="footer-categorias">
          <h2 id="footer-categorias" className="mb-4 text-eyebrow font-mono text-muted-foreground">
            Categorías
          </h2>
          <ul className="grid gap-2 text-sm">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categorias/${category.slug}`}
                  className="hover:text-primary hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-tienda">
          <h2 id="footer-tienda" className="mb-4 text-eyebrow font-mono text-muted-foreground">
            Tienda
          </h2>
          <ul className="grid gap-2 text-sm">
            <li>
              <Link href="/productos" className="hover:text-primary hover:underline">
                Todos los productos
              </Link>
            </li>
            <li>
              <Link href="/productos?oferta=1" className="hover:text-primary hover:underline">
                Ofertas
              </Link>
            </li>
            <li>
              <Link href="/categorias/computadores" className="hover:text-primary hover:underline">
                Computadores armados
              </Link>
            </li>
            <li>
              <Link href="/buscar" className="hover:text-primary hover:underline">
                Buscar productos
              </Link>
            </li>
            <li>
              <Link href="/carrito" className="hover:text-primary hover:underline">
                Carrito
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="mb-4 text-eyebrow font-mono text-muted-foreground">
            Información
          </h2>
          <ul className="grid gap-2 text-sm">
            <li>
              <Link href="/terminos" className="hover:text-primary hover:underline">
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-primary hover:underline">
                Tratamiento de datos
              </Link>
            </li>
            <li>
              <Link href="/garantias" className="hover:text-primary hover:underline">
                Garantías
              </Link>
            </li>
            <li>
              <Link href="/retracto" className="hover:text-primary hover:underline">
                Derecho de retracto
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="container-page py-5 text-xs text-muted-foreground">
          © <CopyrightYear /> {siteConfig.name}. Precios en pesos colombianos (COP).
        </p>
      </div>
    </footer>
  );
}
