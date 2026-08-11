import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development") {
	await initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
	output: "standalone",
	outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
	reactStrictMode: true,
	transpilePackages: [
		"@cinaauth/auth-proxy",
		"@cinaauth/auth-web-contract",
		"@cinaauth/design-tokens",
	],
	env: {
		NEXT_PUBLIC_CINAUTH_BASE_URL:
			process.env.NEXT_PUBLIC_CINAUTH_BASE_URL ?? "https://auth.cinaseek.ai",
		NEXT_PUBLIC_CINAUTH_AUTH_URL:
			process.env.NEXT_PUBLIC_CINAUTH_AUTH_URL ??
			"https://accounts.cinaseek.ai",
	},
};

export default nextConfig;
