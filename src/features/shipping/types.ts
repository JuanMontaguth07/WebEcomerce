/** Cotización de envío a un lugar (tarifa de la ciudad o, si no hay, del departamento). */
export type ShippingQuote = { price: number; minDays: number | null; maxDays: number | null };

export type ShippingRate = ShippingQuote & {
  id: string;
  department: string;
  city: string | null;
  isActive: boolean;
};

/** "1 a 3 días hábiles", "2 días hábiles"… o null si no se indicó. */
export function deliveryLabel({ minDays, maxDays }: Pick<ShippingQuote, "minDays" | "maxDays">) {
  const days = (count: number) => `${count} ${count === 1 ? "día hábil" : "días hábiles"}`;
  if (minDays !== null && maxDays !== null && minDays !== maxDays) {
    return `${minDays} a ${days(maxDays)}`;
  }
  const single = maxDays ?? minDays;
  return single === null ? null : days(single);
}
