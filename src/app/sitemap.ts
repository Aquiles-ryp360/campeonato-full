import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();
  const lastModified = new Date();

  return ["/", "/login", "/c/default/fixture", "/c/default/bases", "/c/default/registro"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7
  }));
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://campeonato-full.vercel.app").replace(/\/$/, "");
}
