import type { MetadataRoute } from "next";

const SITE_URL = "https://accounts.cinaseek.ai";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/dashboard/", "/admin/", "/api/"],
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}
