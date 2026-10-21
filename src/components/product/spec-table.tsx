import { groupSpecs } from "@/features/catalog/specs";
import type { ProductSpec } from "@/features/catalog/types";

/** Ficha técnica agrupada, con valores en tipografía de datos. */
export function SpecTable({ specs }: { specs: ProductSpec[] }) {
  const groups = groupSpecs(specs);

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-x-10">
      {groups.map(({ group, items }) => (
        <div key={group} className="grid content-start gap-2">
          <h3 className="text-eyebrow font-mono text-muted-foreground">{group}</h3>
          <dl className="grid border-t">
            {items.map((spec) => (
              <div
                key={spec.key}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 border-b py-2.5 text-sm"
              >
                <dt className="text-muted-foreground">{spec.label}</dt>
                <dd className="font-mono text-[0.8125rem] break-words">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
