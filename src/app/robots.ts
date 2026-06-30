import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/planer", "/impressum", "/datenschutz", "/agb", "/mvp-hinweis"],
      disallow: ["/admin", "/api", "/dashboard", "/partner/dashboard"]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
