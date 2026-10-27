import { Suspense } from "react";
import { CartButton } from "@/components/cart/cart-button";
import { getBrands, getCategories } from "@/features/catalog/queries";
import { HeaderLink, HeaderLinkView } from "./header-link";
import { Logo } from "./logo";
import { MegaMenu, type MenuCategory } from "./mega-menu";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";
import { ThemeSwitch } from "./theme-switch";

/** Categorías principales con sus subcategorías, en el orden del panel. */
async function getMenuCategories(): Promise<MenuCategory[]> {
  const categories = await getCategories();
  return categories
    .filter((category) => !category.parentId)
    .map((parent) => ({
      name: parent.name,
      slug: parent.slug,
      children: categories
        .filter((child) => child.parentId === parent.id)
        .map(({ name, slug }) => ({ name, slug })),
    }));
}

function HeaderLinks({ Item }: { Item: typeof HeaderLink }) {
  return (
    <div className="flex items-center gap-0.5">
      <Item href="/arma-tu-pc">Arma tu PC</Item>
      <Item href="/productos?oferta=1" tone="sale">
        Ofertas
      </Item>
      <Item href="/nosotros" className="hidden xl:inline-flex">
        Nosotros
      </Item>
      <Item href="/soporte">Soporte</Item>
    </div>
  );
}

/**
 * Encabezado de una fila: logo, mega menú de categorías, buscador, accesos y
 * carrito. En móvil el menú va en un panel lateral y el buscador baja a su fila.
 */
export async function SiteHeader() {
  const [categories, brands] = await Promise.all([getMenuCategories(), getBrands()]);
  const menuBrands = brands.map(({ name, slug }) => ({ name, slug }));

  return (
    <header className="sticky top-0 z-40 border-t-3 border-b border-t-primary bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="relative container-page flex h-16 items-center gap-2 lg:gap-3">
        <MobileNav categories={categories} />
        <Logo />
        <MegaMenu categories={categories} brands={menuBrands} />
        <SearchBox className="mx-2 hidden flex-1 md:block lg:mx-3" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <nav aria-label="Menú principal" className="hidden lg:block">
            {/* Mientras llegan los parámetros de la URL se muestran sin estado activo. */}
            <Suspense fallback={<HeaderLinks Item={HeaderLinkView} />}>
              <HeaderLinks Item={HeaderLink} />
            </Suspense>
          </nav>
          <ThemeSwitch className="mx-1" />
          <CartButton />
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchBox />
      </div>
    </header>
  );
}
