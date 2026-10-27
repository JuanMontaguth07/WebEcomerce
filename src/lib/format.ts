const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formatea pesos colombianos: 2849900 → "$ 2.849.900". */
export function formatCOP(value: number): string {
  return copFormatter.format(value);
}

/** Porcentaje de descuento redondeado hacia abajo, o null si no hay descuento. */
export function discountPercent(price: number, compareAtPrice: number | null): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.floor(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Genera un slug compatible con el dominio `public.slug` de la base de datos. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

/** «1 año de garantía», «18 meses de garantía»; null si no tiene. */
export function formatWarranty(months: number | null): string | null {
  if (!months) return null;
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? "año" : "años"} de garantía`;
  }
  return `${months} ${months === 1 ? "mes" : "meses"} de garantía`;
}
