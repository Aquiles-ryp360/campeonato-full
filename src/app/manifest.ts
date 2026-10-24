import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Campeonato UNA Puno",
    short_name: "Campeonato",
    description: "Inscripciones y panel de delegados del campeonato de futsal y vóley.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFF",
    theme_color: "#171B4F",
    lang: "es-PE",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
