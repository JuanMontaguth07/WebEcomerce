import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { adminNotifyEmails, emailEnabled, sendEmail } = await import("./email");

const message = { to: "cliente@demo.test", subject: "Hola", html: "<p>Hola</p>", text: "Hola" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("envío de correos", () => {
  it("sin Resend configurado no envía nada", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(emailEnabled()).toBe(false);
    expect(await sendEmail(message)).toBe("skipped");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("con Resend envía a su API y un error no hace fallar a quien lo llamó", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Kova <pedidos@kova.test>");
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect(await sendEmail({ ...message, replyTo: "hola@kova.test" })).toBe("sent");
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: "Kova <pedidos@kova.test>",
      to: ["cliente@demo.test"],
      reply_to: "hola@kova.test",
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetch.mockResolvedValue(new Response("nope", { status: 422 }));
    expect(await sendEmail(message)).toBe("failed");
  });

  it("lee los correos de los admins y descarta los inválidos", () => {
    vi.stubEnv("ADMIN_NOTIFY_EMAILS", " uno@kova.test, no-es-correo ,dos@kova.test");
    expect(adminNotifyEmails()).toEqual(["uno@kova.test", "dos@kova.test"]);
  });
});
