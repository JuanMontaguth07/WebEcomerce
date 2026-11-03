import { NewsletterSignup } from "@/components/support/newsletter-signup";

/** «/novedades» al final de Arma tu PC: banda en degradado con la suscripción. */
export function NewsletterBand() {
  return (
    <section
      aria-labelledby="novedades"
      className="zone-gradient relative grid justify-items-center gap-4 overflow-hidden rounded-3xl px-5 py-10 text-center md:px-12 md:py-14"
    >
      <div
        aria-hidden
        className="zone-breathe pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/20 blur-2xl"
      />
      <p className="relative text-eyebrow opacity-80">/novedades</p>
      <h2
        id="novedades"
        className="relative text-3xl leading-[1.05] font-black text-balance font-stretch-118% md:text-5xl"
      >
        Entérate primero de lo que llega
      </h2>
      <p className="relative max-w-xl font-medium">
        Nuevas gráficas, PCs armadas y ofertas. Te escribimos solo cuando hay algo bueno.
      </p>
      <div className="relative flex w-full justify-center">
        <NewsletterSignup source="arma-tu-pc" />
      </div>
    </section>
  );
}
