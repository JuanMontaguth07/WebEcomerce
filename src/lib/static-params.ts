/**
 * Con Cache Components, `generateStaticParams` debe devolver al menos un valor o
 * el build falla. Con el catálogo vacío (p. ej. el primer despliegue de
 * producción) se usa un slug de relleno que la página resuelve con notFound().
 */
export const PLACEHOLDER_SLUG = "__sin-datos__";

export function slugParams(slugs: string[]): { slug: string }[] {
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: PLACEHOLDER_SLUG }];
}
