import Link from "next/link";
import { CartButton } from "@/components/cart/cart-button";
import { GemIcon } from "lucide-react";
import { getCategories, getRarityProducts } from "@/features/catalog/queries";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const [allCategories, rarityProducts] = await Promise.all([
    getCategories(),
    getRarityProducts(false, 1),
  ]);
  const categories = allCategories.filter((category) => !category.parentId);
  const showRarities = rarityProducts.length > 0;
  const navCategories = categories.map(({ name, slug }) => ({ name, slug }));

  return (
    <header className="sticky top-0 z-40 border-t-3 border-b border-t-primary bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container-page flex h-16 items-center gap-3 lg:gap-6">
        <MobileNav categories={navCategories} showRarities={showRarities} />
        <Logo />
        <SearchBox className="hidden flex-1 md:block lg:max-w-xl" />
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/nosotros"
            className="hidden h-10 items-center rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-secondary hover:text-primary lg:inline-flex"
          >
            Nosotros
          </Link>
          <Link
            href="/soporte"
            className="mr-1 hidden h-10 items-center rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-secondary hover:text-primary lg:inline-flex"
          >
            Soporte
          </Link>
          <ThemeToggle />
          <CartButton />
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchBox />
      </div>
      <nav aria-label="Menú principal" className="hidden border-t lg:block">
        <ul className="container-page flex h-11 items-center gap-1 overflow-x-auto text-sm">
          <li>
            <Link
              href="/productos?oferta=1"
              className="inline-flex h-8 items-center rounded-md px-3 font-semibold whitespace-nowrap text-primary hover:bg-primary-soft"
            >
              Ofertas
            </Link>
          </li>
          {showRarities && (
            <li>
              <Link
                href="/rarezas"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-semibold whitespace-nowrap hover:bg-secondary"
              >
                <GemIcon className="size-4 text-primary" aria-hidden />
                Rarezas
              </Link>
            </li>
          )}
          {navCategories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/categorias/${category.slug}`}
                className="inline-flex h-8 items-center rounded-md px-3 whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
