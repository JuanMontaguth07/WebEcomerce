import { serializeJsonLd } from "@/lib/seo";

/** Datos estructurados (schema.org) para buscadores. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
