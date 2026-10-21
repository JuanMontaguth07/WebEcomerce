"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/form-helpers";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/features/admin/catalog-actions";
import type { ProductInput } from "@/features/admin/catalog-schemas";
import { slugify } from "@/lib/format";

type Option = { id: string; name: string; is_active?: boolean };
type Errors = Partial<Record<string, string[]>>;

export type ProductFormValues = {
  name: string;
  slug: string;
  sku: string;
  productType: "component" | "prebuilt" | "peripheral";
  categoryId: string;
  brandId: string;
  price: string;
  compareAtPrice: string;
  lowStockThreshold: string;
  warrantyMonths: string;
  shortDescription: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  productType: "component",
  categoryId: "",
  brandId: "",
  price: "",
  compareAtPrice: "",
  lowStockThreshold: "3",
  warrantyMonths: "12",
  shortDescription: "",
  description: "",
  isActive: false,
  isFeatured: false,
  seoTitle: "",
  seoDescription: "",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6">
      <legend className="px-1 text-lg font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ProductForm({
  productId,
  initial,
  categories,
  brands,
}: {
  productId?: string;
  initial: ProductFormValues;
  categories: Option[];
  brands: Option[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(productId));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      ...(key === "name" ? { slug: undefined } : {}),
    }));
  }

  const text = (key: keyof ProductFormValues) => ({
    value: String(values[key]),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => update(key, event.target.value as never),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const input = values as unknown as ProductInput;
      const result = productId
        ? await updateProduct({ id: productId, values: input })
        : await createProduct(input);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setErrors({});
      if (productId) {
        toast.success("Producto guardado");
        router.refresh();
      } else {
        toast.success("Producto creado. Agrega imágenes, ficha técnica y stock.");
        router.push(`/admin/productos/${result.data.id}` as Route);
      }
    });
  }

  const categoryOptions = [
    { value: "", label: "Selecciona…" },
    ...categories.map((c) => ({
      value: c.id,
      label: c.is_active === false ? `${c.name} (oculta)` : c.name,
    })),
  ];
  const brandOptions = [
    { value: "", label: "Sin marca" },
    ...brands.map((b) => ({
      value: b.id,
      label: b.is_active === false ? `${b.name} (oculta)` : b.name,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6">
      <Section title="Información básica">
        <TextField name="name" label="Nombre" errors={errors} required {...text("name")} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="slug"
            label="Slug (URL)"
            errors={errors}
            hint={`/productos/${values.slug || "…"}`}
            value={values.slug}
            onChange={(event) => {
              setSlugTouched(true);
              update("slug", slugify(event.target.value));
            }}
          />
          <TextField
            name="sku"
            label="SKU"
            errors={errors}
            className="[&_input]:font-mono [&_input]:uppercase"
            {...text("sku")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <SelectField
            name="categoryId"
            label="Categoría"
            errors={errors}
            options={categoryOptions}
            {...text("categoryId")}
          />
          <SelectField
            name="brandId"
            label="Marca"
            errors={errors}
            optional
            options={brandOptions}
            {...text("brandId")}
          />
          <SelectField
            name="productType"
            label="Tipo"
            errors={errors}
            options={[
              { value: "component", label: "Componente" },
              { value: "prebuilt", label: "Computador armado" },
              { value: "peripheral", label: "Periférico" },
            ]}
            {...text("productType")}
          />
        </div>
        <TextAreaField
          name="shortDescription"
          label="Resumen"
          optional
          errors={errors}
          maxLength={300}
          hint="Una o dos frases. Se muestra junto al precio y en buscadores."
          {...text("shortDescription")}
        />
        <TextAreaField
          name="description"
          label="Descripción"
          optional
          errors={errors}
          className="[&_textarea]:min-h-40"
          hint="Separa los párrafos con una línea en blanco."
          {...text("description")}
        />
      </Section>

      <Section title="Precio e inventario">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="price"
            label="Precio (COP)"
            errors={errors}
            inputMode="numeric"
            {...text("price")}
          />
          <TextField
            name="compareAtPrice"
            label="Precio anterior (COP)"
            optional
            errors={errors}
            inputMode="numeric"
            hint="Si es mayor que el precio, el producto aparece como oferta."
            {...text("compareAtPrice")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="lowStockThreshold"
            label="Alerta de stock bajo"
            errors={errors}
            inputMode="numeric"
            hint="Con esta cantidad o menos se muestra «Quedan N unidades»."
            {...text("lowStockThreshold")}
          />
          <TextField
            name="warrantyMonths"
            label="Garantía (meses)"
            optional
            errors={errors}
            inputMode="numeric"
            {...text("warrantyMonths")}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          El stock se ajusta desde el panel de inventario del producto para que cada cambio quede
          registrado.
        </p>
      </Section>

      <Section title="Visibilidad">
        <CheckboxField
          name="isActive"
          label="Visible en la tienda"
          hint="Déjalo oculto mientras completas imágenes y ficha técnica."
          checked={values.isActive}
          onCheckedChange={(checked) => update("isActive", checked)}
        />
        <CheckboxField
          name="isFeatured"
          label="Destacado"
          hint="Aparece en «Productos destacados» de la página de inicio."
          checked={values.isFeatured}
          onCheckedChange={(checked) => update("isFeatured", checked)}
        />
      </Section>

      <Section title="Buscadores (opcional)">
        <TextField
          name="seoTitle"
          label="Título para buscadores"
          optional
          errors={errors}
          maxLength={70}
          hint={`${values.seoTitle.length}/70. Si lo dejas vacío se usa el nombre.`}
          {...text("seoTitle")}
        />
        <TextAreaField
          name="seoDescription"
          label="Descripción para buscadores"
          optional
          errors={errors}
          maxLength={160}
          hint={`${values.seoDescription.length}/160. Si la dejas vacía se usa el resumen.`}
          {...text("seoDescription")}
        />
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <Button type="submit" size="lg" isLoading={pending}>
          {productId ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
