import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AuthFetcher, Session } from "./auth-api";
import {
	createAuthProxyRequest,
	createServerAuthApi,
	DEFAULT_CINAAUTH_API_URL,
} from "./auth-api";

export type {
	ActiveOrganization,
	AuthAccount,
	AuthApiKey,
	AuthApiKeyList,
	AuthPasskey,
	AuthSession,
	AuthUser,
	AuthWallet,
	DeviceSession,
	EntitlementSnapshot,
	FullOrganization,
	OAuthClientPublic,
	OAuthClientRecord,
	OAuthConsentRecord,
	OrganizationAuditEntry,
	OrganizationAuditList,
	OrganizationDynamicRole,
	OrganizationRole,
	OrganizationTeam,
	OrganizationTeamMember,
	SCIMProviderConnection,
	Session,
	SSOProviderSummary,
} from "./auth-api";
export { createAuthProxyResponse } from "./auth-api";

type AuthWorkerEnv = {
	AUTH_WORKER?: AuthFetcher;
};

const publicAuthFetcher: AuthFetcher = {
	fetch: (request) => fetch(request),
};

const resolveAuthFetcher = async (): Promise<AuthFetcher> => {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const binding = (env as AuthWorkerEnv).AUTH_WORKER;
		if (binding && typeof binding.fetch === "function") {
			return binding;
		}
	} catch {
		// Local Next.js development can run without Wrangler. In that case the
		// same typed API client calls the public production URL below.
	}
	return publicAuthFetcher;
};

const lazyAuthFetcher: AuthFetcher = {
	fetch: async (request) => (await resolveAuthFetcher()).fetch(request),
};

const api = createServerAuthApi(
	lazyAuthFetcher,
	process.env.CINAAUTH_URL || DEFAULT_CINAAUTH_API_URL,
);

export const forwardAuthRequest = async (request: Request) => {
	const proxied = createAuthProxyRequest(
		request,
		process.env.CINAAUTH_URL || DEFAULT_CINAAUTH_API_URL,
	);
	return (await resolveAuthFetcher()).fetch(proxied);
};

/**
 * Server-side CinaAuth facade used by React Server Components. Requests use
 * the Cloudflare Service Binding in production and preserve the caller's
 * Cookie header; local development falls back to the public Auth Worker URL.
 */
export const auth = {
	api,
	$Infer: {} as {
		Session: Session;
	},
};
