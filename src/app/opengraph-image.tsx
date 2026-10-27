import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";

// Imagen al compartir el sitio (WhatsApp, redes). Se genera en el build con el
// nombre configurado; los productos con fotos usan la suya.
export const alt = DEFAULT_OG_IMAGE.alt;
export const size = { width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height };
export const contentType = "image/png";

const COLORS = {
  background: "#101318",
  surface: "#1B222C",
  border: "#2C3542",
  foreground: "#F1F4F6",
  muted: "#929BA8",
  accent: "#B8FF5C",
  onAccent: "#101318",
};

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: COLORS.background,
        backgroundImage: `radial-gradient(circle at 85% 20%, rgba(184,255,92,0.24), transparent 55%)`,
        color: COLORS.foreground,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="72" height="72" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill={COLORS.accent} />
          <path
            d="M11 8.5v15M21.5 8.5 14 16l7.5 7.5"
            fill="none"
            stroke={COLORS.onAccent}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="22" y="14.4" width="3.2" height="3.2" rx="0.8" fill={COLORS.onAccent} />
        </svg>
        <span style={{ fontSize: 30, color: COLORS.muted, letterSpacing: 2 }}>
          HARDWARE · COLOMBIA
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <span style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          {siteConfig.name}
        </span>
        <span style={{ fontSize: 38, color: COLORS.muted, maxWidth: 900, lineHeight: 1.3 }}>
          {siteConfig.shortDescription}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 26,
          color: COLORS.foreground,
        }}
      >
        {["Ficha técnica completa", "Stock al momento", "Precios en COP"].map((label) => (
          <span
            key={label}
            style={{
              display: "flex",
              padding: "10px 22px",
              border: `2px solid ${COLORS.border}`,
              borderRadius: 999,
              background: COLORS.surface,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>,
    size,
  );
}
