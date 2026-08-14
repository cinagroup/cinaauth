import { OIDC_DEMO_CLIENT_ID } from "@cinaauth/auth-web-contract";
import type { CloudflareBindings } from "../src/env";

export const PRODUCTION_ORIGIN_ENV = {
	CINAAUTH_URL: "https://auth.cinaseek.ai",
	CINAAUTH_ACCOUNT_ORIGIN: "https://accounts.cinaseek.ai",
	CINAAUTH_ADMIN_ORIGIN: "https://admin.cinaseek.ai",
	CINAAUTH_PASSKEY_RP_ID: "cinaseek.ai",
	CINAAUTH_LEGACY_ACCOUNT_ORIGIN: "https://demo-auth.cinagroup.com",
	CINAAUTH_OIDC_DEMO_ENVIRONMENT: "production",
	CINAAUTH_OIDC_DEMO_ORIGIN: "https://oidc-demo.cinaseek.ai",
	CINAAUTH_OIDC_DEMO_CLIENT_ID: OIDC_DEMO_CLIENT_ID,
} as const;

export const makeOriginEnv = (
	overrides: Partial<CloudflareBindings> = {},
): CloudflareBindings =>
	({
		...PRODUCTION_ORIGIN_ENV,
		...overrides,
	}) as CloudflareBindings;
