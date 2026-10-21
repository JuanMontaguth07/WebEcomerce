"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckboxField, TextAreaField, TextField } from "@/components/admin/form-helpers";
import { Button } from "@/components/ui/button";
import { createBrand, updateBrand } from "@/features/admin/catalog-actions";
import { slugify } from "@/lib/format";

type Errors = Partial<Record<string, string[]>>;

export type BrandFormValues = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
};

export function BrandForm({ brandId, initial }: { brandId?: string; initial: BrandFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(brandId));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  const set = (key: keyof BrandFormValues, value: string | boolean) => {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "name" && !slugTouched ? { slug: slugify(String(value)) } : {}),
    }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = brandId
        ? await updateBrand({ id: brandId, values })
        : await createBrand(values);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success(brandId ? "Marca guardada" : "Marca creada");
      if (brandId) router.refresh();
      else router.push("/admin/marcas" as Route);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          label="Nombre"
          errors={errors}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <TextField
          name="slug"
          label="Slug (URL)"
          errors={errors}
          hint={`/marcas/${values.slug || "…"}`}
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", slugify(e.target.value));
          }}
        />
      </div>
      <TextAreaField
        name="description"
        label="Descripción"
        optional
        errors={errors}
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
      />
      <CheckboxField
        name="isActive"
        label="Visible en la tienda"
        checked={values.isActive}
        onCheckedChange={(checked) => set("isActive", checked)}
      />
      <div>
        <Button type="submit" isLoading={pending}>
          {brandId ? "Guardar cambios" : "Crear marca"}
        </Button>
      </div>
    </form>
  );
}
