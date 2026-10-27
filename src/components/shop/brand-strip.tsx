import Image from "next/image";
import Link from "next/link";
import { storageImageUrl } from "@/lib/images";
import { Marquee } from "./marquee";
import { SectionHeader } from "./section-header";

export type StripBrand = { name: string; slug: string; logoPath: string | null; count: number };

const products = (count: number) => `${count} ${count === 1 ? "producto" : "productos"}`;

/**
 * Marcas con productos publicados, las de más productos primero, en una fila que
 * se desliza sola. El logo lo sube el admin; va sobre una placa clara para que
 * cualquier logo se lea en ambos temas.
 */
export function BrandStrip({ brands, index }: { brands: StripBrand[]; index?: number }) {
  if (!brands.length) return null;

  return (
    <section aria-labelledby="marcas" className="reveal grid gap-6">
      <SectionHeader
        id="marcas"
        index={index}
        eyebrow="Marcas"
        title="Compra por marca"
        align="center"
        className="container-page"
      />
      <Marquee
        label="Marcas"
        seconds={Math.max(24, brands.length * 5)}
        reverse
        items={brands.map((brand) => ({
          key: brand.slug,
          node: (
            <Link
              href={`/marcas/${brand.slug}`}
              className="group grid w-44 gap-2 rounded-2xl border bg-card p-3 transition-[border-color,box-shadow] duration-300 ease-out-soft hover:border-primary/50 hover:shadow-glow"
            >
              <span className="relative grid h-14 place-items-center overflow-hidden rounded-xl bg-[#f1f4f6] text-[#101318]">
                {brand.logoPath ? (
                  <Image
                    src={storageImageUrl(brand.logoPath)}
                    alt={brand.name}
                    fill
                    sizes="11rem"
                    className="object-contain p-3 transition-transform duration-300 ease-out-soft group-hover:scale-105"
                  />
                ) : (
                  <span className="px-2 text-center font-heading text-base leading-tight font-bold font-stretch-112%">
                    {brand.name}
                  </span>
                )}
              </span>
              <span className="flex items-baseline justify-between gap-2 px-1">
                {brand.logoPath && (
                  <span className="truncate text-sm font-semibold">{brand.name}</span>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {products(brand.count)}
                </span>
              </span>
            </Link>
          ),
        }))}
      />
    </section>
  );
}
