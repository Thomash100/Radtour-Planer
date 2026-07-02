import type { MetadataRoute } from "next";

import { APP_INDEXING_ALLOWED } from "@/lib/version";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: APP_INDEXING_ALLOWED
      ? {
          userAgent: "*",
          allow: ["/", "/planer", "/touren", "/impressum", "/datenschutz", "/agb", "/mvp-hinweis"],
          disallow: ["/admin", "/api", "/dashboard", "/partner/dashboard"]
        }
      : {
          userAgent: "*",
          disallow: "/"
        },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
