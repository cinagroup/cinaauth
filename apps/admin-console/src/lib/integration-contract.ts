export type AdminSsoProvider = {
	providerId: string;
	type: "oidc" | "saml";
	issuer: string;
	domain: string;
	organizationId: string | null;
	domainVerified: boolean;
	spMetadataUrl?: string;
};

export type AdminScimProvider = {
	id: string;
	providerId: string;
	organizationId: string | null;
};

export type OidcSsoRegistration = {
	providerId: string;
	organizationId: string;
	issuer: string;
	domain: string;
	oidcConfig: {
		clientId: string;
		clientSecret: string;
		discoveryEndpoint: string;
		pkce: true;
		scopes: ["openid", "email", "profile"];
	};
};

export type ScimTokenRegistration = {
	providerId: string;
	organizationId: string;
};

export type DomainVerificationAction = {
	action: "request" | "verify";
	providerId: string;
	organizationId: string;
};

export type DnsVerificationRecord = {
	domain: string;
	host: string;
	value: string;
};

type ParseResult<T> =
	| { success: true; value: T }
	| { success: false; message: string };

const SSO_PROVIDER_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SCIM_PROVIDER_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;
const IDENTIFIER_PREFIX = "_cinaauth-token-";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readTrimmedString = (
	value: unknown,
	maximumLength: number,
): string | null => {
	if (typeof value !== "string") return null;
	const normalized = value.trim();
	return normalized.length > 0 && normalized.length <= maximumLength
		? normalized
		: null;
};

const readHttpsUrl = (value: unknown): string | null => {
	const input = readTrimmedString(value, 2_048);
	if (!input) return null;
	try {
		const url = new URL(input);
		if (url.protocol !== "https:" || url.username || url.password || url.hash) {
			return null;
		}
		return input;
	} catch {
		return null;
	}
};

const normalizeDomain = (value: string): string | null => {
	try {
		const url = new URL(value.includes("://") ? value : `https://${value}`);
		if (url.username || url.password || !url.hostname) return null;
		return url.hostname.toLowerCase().replace(/\.$/, "");
	} catch {
		return null;
	}
};

export const parseOrganizationId = (value: unknown): string | null => {
	const organizationId = readTrimmedString(value, 255);
	return organizationId && !/[\u0000-\u001f\u007f]/.test(organizationId)
		? organizationId
		: null;
};

export const parseSsoProviderId = (value: unknown): string | null => {
	const providerId = readTrimmedString(value, 63);
	if (
		!providerId ||
		!SSO_PROVIDER_ID_PATTERN.test(providerId) ||
		`${IDENTIFIER_PREFIX}${providerId}`.length > 63
	) {
		return null;
	}
	return providerId;
};

export const parseOidcSsoRegistration = (
	value: unknown,
): ParseResult<OidcSsoRegistration> => {
	if (!isRecord(value) || !isRecord(value.oidcConfig)) {
		return {
			success: false,
			message: "Explicit OIDC configuration is required",
		};
	}

	const providerId = parseSsoProviderId(value.providerId);
	const organizationId = parseOrganizationId(value.organizationId);
	const issuer = readHttpsUrl(value.issuer);
	const domain = readTrimmedString(value.domain, 1_024);
	const clientId = readTrimmedString(value.oidcConfig.clientId, 512);
	const clientSecret = readTrimmedString(value.oidcConfig.clientSecret, 4_096);
	const discoveryEndpoint = readHttpsUrl(value.oidcConfig.discoveryEndpoint);
	const domains = domain
		?.split(",")
		.map((entry) => normalizeDomain(entry.trim()))
		.filter((entry): entry is string => entry !== null);

	if (
		!providerId ||
		!organizationId ||
		!issuer ||
		!domain ||
		!domains?.length ||
		domains.length !== domain.split(",").length ||
		!clientId ||
		!clientSecret ||
		!discoveryEndpoint
	) {
		return {
			success: false,
			message:
				"organizationId, providerId, domain, HTTPS issuer, and complete OIDC credentials are required",
		};
	}

	return {
		success: true,
		value: {
			providerId,
			organizationId,
			issuer,
			domain,
			oidcConfig: {
				clientId,
				clientSecret,
				discoveryEndpoint,
				pkce: true,
				scopes: ["openid", "email", "profile"],
			},
		},
	};
};

export const parseDomainVerificationAction = (
	value: unknown,
): ParseResult<DomainVerificationAction> => {
	if (!isRecord(value)) {
		return { success: false, message: "Invalid request body" };
	}
	const providerId = parseSsoProviderId(value.providerId);
	const organizationId = parseOrganizationId(value.organizationId);
	if (
		!providerId ||
		!organizationId ||
		(value.action !== "request" && value.action !== "verify")
	) {
		return {
			success: false,
			message: "action, providerId, and organizationId are required",
		};
	}
	return {
		success: true,
		value: { action: value.action, providerId, organizationId },
	};
};

export const parseScimTokenRegistration = (
	value: unknown,
): ParseResult<ScimTokenRegistration> => {
	if (!isRecord(value)) {
		return { success: false, message: "Invalid request body" };
	}
	const providerId = readTrimmedString(value.providerId, 100);
	const organizationId = parseOrganizationId(value.organizationId);
	if (!providerId || !SCIM_PROVIDER_ID_PATTERN.test(providerId)) {
		return { success: false, message: "A valid providerId is required" };
	}
	if (!organizationId) {
		return { success: false, message: "organizationId is required" };
	}
	return {
		success: true,
		value: {
			providerId,
			organizationId,
		},
	};
};

export const buildDnsVerificationRecords = (
	providerId: string,
	domain: string,
	token: string,
): DnsVerificationRecord[] => {
	const identifier = `${IDENTIFIER_PREFIX}${providerId}`;
	return domain
		.split(",")
		.map((entry) => normalizeDomain(entry.trim()))
		.filter((entry): entry is string => entry !== null)
		.map((entry) => ({
			domain: entry,
			host: `${identifier}.${entry}`,
			value: `${identifier}=${token}`,
		}));
};
