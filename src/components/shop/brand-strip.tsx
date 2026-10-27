import Image from "next/image";
import Link from "next/link";
import { storageImageUrl } from "@/lib/images";

export type StripBrand = { name: string; slug: string; logoPath: string | null; count: number };

const products = (count: number) => `${count} ${count === 1 ? "producto" : "productos"}`;

/**
 * Marcas con productos publicados, las de más productos primero. El logo lo sube
 * el admin; va sobre una placa clara para que cualquier logo se lea en ambos temas.
 */
export function BrandStrip({ brands }: { brands: StripBrand[] }) {
  if (!brands.length) return null;

  return (
    <section aria-labelledby="marcas" className="reveal container-page grid gap-6">
      <h2 id="marcas" className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
        <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-primary" />
        Compra por marca
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {brands.map((brand) => (
          <li key={brand.slug}>
            <Link
              href={`/marcas/${brand.slug}`}
              className="group grid h-full gap-3 rounded-2xl border bg-card p-3 transition-[border-color,box-shadow] duration-300 ease-out-soft hover:border-primary/50 hover:shadow-glow"
            >
              <span className="relative grid h-16 place-items-center overflow-hidden rounded-xl bg-[#f1f4f6] text-[#101318]">
                {brand.logoPath ? (
                  <Image
                    src={storageImageUrl(brand.logoPath)}
                    alt={brand.name}
                    fill
                    sizes="12rem"
                    className="object-contain p-3 transition-transform duration-300 ease-out-soft group-hover:scale-105"
                  />
                ) : (
                  <span className="px-2 text-center font-heading text-lg leading-tight font-bold font-stretch-112%">
                    {brand.name}
                  </span>
                )}
              </span>
              <span className="grid gap-0.5 px-1">
                {brand.logoPath && (
                  <span className="truncate text-sm font-semibold">{brand.name}</span>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {products(brand.count)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
