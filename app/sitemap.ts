import type { MetadataRoute } from "next";

const BASE_URL = "https://aigeniuslab.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/courses", "/pricing", "/contact", "/sign-in", "/sign-up"];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
