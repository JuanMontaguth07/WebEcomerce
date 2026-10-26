import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";

// Imagen al compartir el sitio (WhatsApp, redes). Se genera en el build con el
// nombre configurado; los productos con fotos usan la suya.
export const alt = DEFAULT_OG_IMAGE.alt;
export const size = { width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height };
export const contentType = "image/png";

const COLORS = {
  background: "#0A0C10",
  surface: "#12151B",
  border: "#282E3A",
  foreground: "#ECEFF5",
  muted: "#97A0AF",
  accent: "#6B95FF",
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
        backgroundImage: `radial-gradient(circle at 85% 20%, rgba(107,149,255,0.22), transparent 55%)`,
        color: COLORS.foreground,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="72" height="72" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill={COLORS.surface} />
          <rect
            x="9"
            y="9"
            width="14"
            height="14"
            rx="2"
            fill="none"
            stroke={COLORS.accent}
            strokeWidth="2"
          />
          <path
            d="M13 5v4M19 5v4M13 23v4M19 23v4M5 13h4M5 19h4M23 13h4M23 19h4"
            stroke={COLORS.accent}
            strokeWidth="2"
            strokeLinecap="round"
          />
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
