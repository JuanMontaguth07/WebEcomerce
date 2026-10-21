import { siteConfig } from "@/config/site";

// Página provisional de la Fase 1. La home real se construye en la Fase 3.
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-24">
      <p className="text-sm tracking-widest text-neutral-500 uppercase">En construcción</p>
      <h1 className="text-4xl font-bold tracking-tight text-balance">{siteConfig.name}</h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        {siteConfig.shortDescription}
      </p>
    </main>
  );
}
