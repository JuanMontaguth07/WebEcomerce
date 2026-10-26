import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.shortDescription,
    lang: siteConfig.locale,
    start_url: "/",
    display: "standalone",
    background_color: "#F5F6F8",
    theme_color: "#0A0C10",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
