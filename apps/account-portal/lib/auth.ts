import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AuthFetcher, Session } from "./auth-api";
import { createAuthProxyRequest, createServerAuthApi } from "./auth-api";
import {
	createAuthServiceUnavailableResponse,
	resolveAuthRuntimeConfiguration,
	UNAVAILABLE_CINAAUTH_API_URL,
} from "./auth-runtime-config";

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

const publicAuthFetcher: AuthFetcher = {
	fetch: (request) => fetch(request),
};

const unavailableAuthFetcher: AuthFetcher = {
	fetch: async () => createAuthServiceUnavailableResponse(),
};

const runtimeConfiguration = resolveAuthRuntimeConfiguration();

const reportUnavailableTransport = (
	reason: "context-unavailable" | "missing-binding" | "runtime-configuration",
) => {
	console.error(
		JSON.stringify({
			event: "cinaauth.auth_transport_unavailable",
			reason,
			configurationFailure: runtimeConfiguration.failure,
		}),
	);
};

const resolveAuthFetcher = async (): Promise<AuthFetcher> => {
	if (!runtimeConfiguration.baseURL) {
		reportUnavailableTransport("runtime-configuration");
		return unavailableAuthFetcher;
	}
	try {
		const { env } = await getCloudflareContext({ async: true });
		const binding = env.AUTH_WORKER;
		if (binding && typeof binding.fetch === "function") {
			return binding;
		}
	} catch {
		if (!runtimeConfiguration.publicFallbackAllowed) {
			reportUnavailableTransport("context-unavailable");
			return unavailableAuthFetcher;
		}
	}
	if (runtimeConfiguration.publicFallbackAllowed) return publicAuthFetcher;
	reportUnavailableTransport("missing-binding");
	return unavailableAuthFetcher;
};

const lazyAuthFetcher: AuthFetcher = {
	fetch: async (request) => (await resolveAuthFetcher()).fetch(request),
};

const api = createServerAuthApi(
	lazyAuthFetcher,
	runtimeConfiguration.baseURL ?? UNAVAILABLE_CINAAUTH_API_URL,
);

/** Sends an internal server request through the configured Auth transport. */
export const fetchAuthServiceRequest = async (
	pathname: string,
	init?: RequestInit,
) => {
	if (!runtimeConfiguration.baseURL || !pathname.startsWith("/")) {
		reportUnavailableTransport("runtime-configuration");
		return createAuthServiceUnavailableResponse();
	}
	const target = new URL(pathname, runtimeConfiguration.baseURL);
	if (target.origin !== runtimeConfiguration.baseURL) {
		reportUnavailableTransport("runtime-configuration");
		return createAuthServiceUnavailableResponse();
	}
	return (await resolveAuthFetcher()).fetch(new Request(target, init));
};

export const forwardAuthRequest = async (request: Request) => {
	if (!runtimeConfiguration.baseURL) {
		reportUnavailableTransport("runtime-configuration");
		return createAuthServiceUnavailableResponse();
	}
	const proxied = createAuthProxyRequest(request, runtimeConfiguration.baseURL);
	return (await resolveAuthFetcher()).fetch(proxied);
};

/**
 * Server-side CinaAuth facade used by React Server Components. Requests use
 * the Cloudflare Service Binding when configured and preserve the caller's
 * Cookie header. Only an explicit local `false` policy permits public HTTP.
 */
export const auth = {
	api,
	$Infer: {} as {
		Session: Session;
	},
};
