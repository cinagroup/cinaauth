import { X509Certificate } from "node:crypto";
import { getHostname } from "tldts";

/**
 * Detect whether X509Certificate is available at runtime. On Cloudflare
 * Workers (nodejs_compat), node:crypto is partially implemented and
 * X509Certificate is NOT available — calling new X509Certificate() throws
 * "X509Certificate is not defined" at runtime. This guard lets the SSO
 * plugin load without crashing; parseCertificate degrades to a
 * Web-Crypto-based fingerprint when X509Certificate is unavailable.
 */
const hasX509Certificate =
	typeof X509Certificate !== "undefined" &&
	typeof (globalThis as Record<string, unknown>).X509Certificate !==
		"undefined";

/**
 * Safely parses a value that might be a JSON string or already a parsed object.
 * This handles cases where ORMs like Drizzle might return already parsed objects
 * instead of JSON strings from TEXT/JSON columns.
 *
 * @param value - The value to parse (string, object, null, or undefined)
 * @returns The parsed object or null
 * @throws Error if string parsing fails
 */
export function safeJsonParse<T>(
	value: string | T | null | undefined,
): T | null {
	if (!value) return null;

	if (typeof value === "object") {
		return value as T;
	}

	if (typeof value === "string") {
		try {
			return JSON.parse(value) as T;
		} catch (error) {
			throw new Error(
				`Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	return null;
}

/**
 * Checks if a domain matches any domain in a comma-separated list.
 */
export const domainMatches = (searchDomain: string, domainList: string) => {
	const search = searchDomain.trim().toLowerCase();
	const domains = parseProviderDomains(domainList);
	if (!search || !domains) {
		return false;
	}
	return domains.some(
		(domain) => search === domain || search.endsWith(`.${domain}`),
	);
};

/**
 * Strictly parse a provider-supplied email-verification claim.
 *
 * OIDC userInfo, OIDC id-token, and SAML attribute values are frequently
 * strings, so a loose `Boolean(value)` or truthy fallback treats the string
 * `"false"` as verified. Only a boolean `true` or the exact string `"true"`
 * count as verified; every other value, including `"false"`, `"0"`, `""`,
 * numbers, arrays, and objects, is unverified.
 */
export const parseProviderEmailVerified = (value: unknown): boolean =>
	value === true || value === "true";

/**
 * Validates email domain against allowed domain(s).
 * Supports comma-separated domains for multi-domain SSO.
 */
export const validateEmailDomain = (email: string, domain: string) => {
	const emailDomain = email.split("@")[1]?.toLowerCase();
	if (!emailDomain || !domain) {
		return false;
	}
	return domainMatches(emailDomain, domain);
};

export function parseCertificate(certPem: string) {
	// SAML metadata X509Certificate elements contain raw base64 without PEM headers,
	// but users may also provide full PEM-formatted certificates. Normalize to PEM.
	const normalized = certPem.includes("-----BEGIN")
		? certPem
		: `-----BEGIN CERTIFICATE-----\n${certPem}\n-----END CERTIFICATE-----`;

	if (!hasX509Certificate) {
		// Cloudflare Workers fallback: X509Certificate and createHash from
		// node:crypto are NOT available under nodejs_compat. Return the raw
		// base64 content as a pseudo-fingerprint — it uniquely identifies the
		// certificate for comparison purposes. Validity dates and key algorithm
		// are unknown in this mode; callers needing them should use Node.js.
		const base64 = normalized
			.replace(/-----[A-Z ]+-----/g, "")
			.replace(/\s/g, "");
		return {
			fingerprintSha256: base64,
			notBefore: "",
			notAfter: "",
			publicKeyAlgorithm: "UNKNOWN",
		};
	}

	const cert = new X509Certificate(normalized);

	return {
		fingerprintSha256: cert.fingerprint256,
		notBefore: cert.validFrom,
		notAfter: cert.validTo,
		publicKeyAlgorithm:
			cert.publicKey.asymmetricKeyType?.toUpperCase() || "UNKNOWN",
	};
}

/**
 * samlify >= 2.11 parses private keys with Node's native crypto (OpenSSL 3),
 * which rejects PEM blocks carrying leading indentation that the previous
 * node-forge implementation tolerated. Trim each line so keys pasted with
 * surrounding whitespace (e.g. indented YAML/JSON config) still load.
 */
export function normalizePem(key: string): string;
export function normalizePem(key: string | undefined): string | undefined;
export function normalizePem(key: string | undefined): string | undefined {
	if (!key) return key;
	return `${key
		.split("\n")
		.map((line) => line.trim())
		.join("\n")
		.trim()}\n`;
}

function getHostnameFromDomain(domain: string): string | null {
	return getHostname(domain) || null;
}

/**
 * Normalize a provider `domain` value to the email domains it authorizes.
 *
 * TODO(next): replace the serialized provider.domain string with a canonical
 * domains array and reject URL/path-shaped values at register/update once main
 * and next provider schemas are reconciled.
 */
export function parseProviderDomains(domain: string): string[] | null {
	const entries = domain
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
	if (entries.length === 0) {
		return null;
	}
	const domains = new Set<string>();
	for (const entry of entries) {
		const parsedDomain = getHostnameFromDomain(entry)?.toLowerCase();
		if (!parsedDomain) {
			return null;
		}
		domains.add(parsedDomain);
	}
	return [...domains];
}

export function maskClientId(clientId: string): string {
	if (clientId.length <= 4) {
		return "****";
	}
	return `****${clientId.slice(-4)}`;
}
