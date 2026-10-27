"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckboxField, TextAreaField, TextField } from "@/components/admin/form-helpers";
import { ImageUploadField, useImageUpload } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { createBrand, updateBrand } from "@/features/admin/catalog-actions";
import { slugify } from "@/lib/format";

type Errors = Partial<Record<string, string[]>>;

export type BrandFormValues = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  logoPath: string | null;
};

export function BrandForm({ brandId, initial }: { brandId?: string; initial: BrandFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(brandId));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const logo = useImageUpload("brands");

  const set = (key: keyof BrandFormValues, value: string | boolean | null) => {
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
      const uploaded = await logo.upload();
      if (!uploaded.ok) return;
      const next = { ...values, logoPath: uploaded.path ?? values.logoPath };
      const result = brandId
        ? await updateBrand({ id: brandId, values: next })
        : await createBrand(next);
      if (!result.ok) {
        await logo.discard(uploaded.path);
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setValues(next);
      logo.reset();
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
          autoFocus={!brandId}
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
      <ImageUploadField
        id="brand-logo"
        legend="Logo"
        hint="Se muestra en «Compra por marca» de la portada. Usa el logo oficial que te autorice la marca, idealmente PNG o WebP con fondo transparente, máximo 2 MB. Sin logo se muestra el nombre."
        image={logo}
        currentPath={values.logoPath}
        onRemove={() => set("logoPath", null)}
        removeLabel="Quitar logo"
        fit="contain"
        fallback={
          <span className="px-3 text-center text-sm font-semibold">{values.name || "Marca"}</span>
        }
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
