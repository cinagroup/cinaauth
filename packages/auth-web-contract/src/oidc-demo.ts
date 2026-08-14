/** Canonical production origin for the public CinaAuth OIDC acceptance client. */
export const OIDC_DEMO_ORIGIN = "https://oidc-demo.cinaseek.ai";

/** Canonical issuer used by the public CinaAuth OIDC acceptance client. */
export const OIDC_DEMO_ISSUER = "https://auth.cinaseek.ai";

/** Stable first-party public client identifier managed as deployment infrastructure. */
export const OIDC_DEMO_CLIENT_ID = "cinaauth-oidc-demo";

/** Canonical production Account Portal origin used for authorization UI. */
export const OIDC_DEMO_ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";

/** Exact authorization-code redirect URI registered for the acceptance client. */
export const OIDC_DEMO_REDIRECT_URI = `${OIDC_DEMO_ORIGIN}/callback`;

/** Exact post-logout URI registered for the acceptance client. */
export const OIDC_DEMO_POST_LOGOUT_URI = OIDC_DEMO_ORIGIN;

/** Supported deployment identities for the public OIDC acceptance client. */
export type OidcDemoEnvironment = "production" | "staging";

/** Untrusted deployment inputs accepted by {@link resolveOidcDemoProfile}. */
export type OidcDemoProfileInput = {
	environment?: unknown;
	applicationOrigin?: unknown;
	issuer?: unknown;
	accountOrigin?: unknown;
	clientId?: unknown;
};

/** Validated, fully-derived public OIDC acceptance configuration. */
export type OidcDemoProfile = {
	environment: OidcDemoEnvironment;
	applicationOrigin: string;
	issuer: string;
	accountOrigin: string;
	clientId: string;
	redirectUri: string;
	postLogoutRedirectUri: string;
	scope: "openid profile email";
};

/** Explicit inputs for the existing production OIDC acceptance deployment. */
export const OIDC_DEMO_PRODUCTION_PROFILE_INPUT = Object.freeze({
	environment: "production",
	applicationOrigin: OIDC_DEMO_ORIGIN,
	issuer: OIDC_DEMO_ISSUER,
	accountOrigin: OIDC_DEMO_ACCOUNT_ORIGIN,
	clientId: OIDC_DEMO_CLIENT_ID,
} satisfies OidcDemoProfileInput);

const PROFILE_ORIGIN_KEYS = [
	"applicationOrigin",
	"issuer",
	"accountOrigin",
] as const;

const parseCanonicalHttpsOrigin = (name: string, value: unknown) => {
	if (
		typeof value !== "string" ||
		value.length === 0 ||
		value.trim() !== value
	) {
		throw new Error(`${name} must be an exact canonical HTTPS origin`);
	}

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`${name} must be an exact canonical HTTPS origin`);
	}

	if (
		url.protocol !== "https:" ||
		url.username !== "" ||
		url.password !== "" ||
		url.port !== "" ||
		url.pathname !== "/" ||
		url.search !== "" ||
		url.hash !== "" ||
		url.origin !== value
	) {
		throw new Error(`${name} must be an exact canonical HTTPS origin`);
	}
	return url.origin;
};

const parseClientId = (value: unknown) => {
	if (
		typeof value !== "string" ||
		value.length === 0 ||
		value.length > 128 ||
		value.trim() !== value ||
		!/^[a-zA-Z0-9](?:[a-zA-Z0-9._:-]{0,126}[a-zA-Z0-9])?$/.test(value)
	) {
		throw new Error(
			"clientId must be a non-empty canonical public client identifier",
		);
	}
	return value;
};

const hasStagingMarker = (value: string) =>
	/(?:^|[.-])staging(?:[.-]|$)/i.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Validates a complete OIDC acceptance deployment profile and derives its
 * redirect contract. Missing, mixed-environment, or non-canonical input is
 * rejected instead of falling back to production.
 */
export const resolveOidcDemoProfile = (input: unknown): OidcDemoProfile => {
	if (!isRecord(input)) {
		throw new Error("OIDC demo profile must be an object");
	}
	const values = input;
	if (values.environment !== "production" && values.environment !== "staging") {
		throw new Error("environment must be exactly production or staging");
	}

	const environment = values.environment;
	const origins = {
		applicationOrigin: parseCanonicalHttpsOrigin(
			"applicationOrigin",
			values.applicationOrigin,
		),
		issuer: parseCanonicalHttpsOrigin("issuer", values.issuer),
		accountOrigin: parseCanonicalHttpsOrigin(
			"accountOrigin",
			values.accountOrigin,
		),
	};
	const clientId = parseClientId(values.clientId);

	if (new Set(Object.values(origins)).size !== PROFILE_ORIGIN_KEYS.length) {
		throw new Error("OIDC demo profile origins must be role-distinct");
	}

	if (environment === "production") {
		const matchesProduction =
			origins.applicationOrigin === OIDC_DEMO_ORIGIN &&
			origins.issuer === OIDC_DEMO_ISSUER &&
			origins.accountOrigin === OIDC_DEMO_ACCOUNT_ORIGIN &&
			clientId === OIDC_DEMO_CLIENT_ID;
		if (!matchesProduction) {
			throw new Error(
				"production OIDC demo profile must match the registered production contract",
			);
		}
	} else {
		for (const key of PROFILE_ORIGIN_KEYS) {
			if (!hasStagingMarker(new URL(origins[key]).hostname)) {
				throw new Error(`${key} must identify an isolated staging host`);
			}
		}
		if (!hasStagingMarker(clientId)) {
			throw new Error("clientId must identify an isolated staging client");
		}
	}

	return Object.freeze({
		environment,
		...origins,
		clientId,
		redirectUri: `${origins.applicationOrigin}/callback`,
		postLogoutRedirectUri: origins.applicationOrigin,
		scope: "openid profile email",
	});
};
