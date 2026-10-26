import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRobots(vercelEnv: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tienda.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proyecto.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_clave_de_prueba");
  vi.stubEnv("VERCEL_ENV", vercelEnv);
  return (await import("./robots")).default();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots", () => {
  it("bloquea todo fuera de producción", async () => {
    expect(await loadRobots("preview")).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(await loadRobots(undefined)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("en producción deja fuera las páginas privadas y publica el sitemap", async () => {
    const robots = await loadRobots("production");
    expect(robots.sitemap).toBe("https://tienda.example/sitemap.xml");
    const rules = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rules?.disallow).toEqual(
      expect.arrayContaining(["/admin", "/checkout", "/pedido/", "/carrito"]),
    );
  });
});
