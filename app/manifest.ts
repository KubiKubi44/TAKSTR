import type { MetadataRoute } from "next";

// Web App Manifest — dělá z appky instalovatelnou PWA (Přidat na plochu).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TAK - Dashboard",
    short_name: "TAK",
    description: "Interní nástroj studia — leady, projekty, finance, kalendář.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
