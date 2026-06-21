import type { MetadataRoute } from "next";

const SITE_URL = "https://demo-auth.cinagroup.com";

export default function sitemap(): MetadataRoute.Sitemap {
	// Public marketing routes only — auth/dashboard/admin excluded.
	const publicRoutes = [
		"",
		"/sign-in",
		"/sign-up",
		"/pricing",
		"/forgot-password",
	];

	return publicRoutes.map((route) => ({
		url: `${SITE_URL}${route}`,
		lastModified: new Date(),
		changeFrequency: "weekly",
		priority: route === "" ? 1.0 : 0.7,
	}));
}
