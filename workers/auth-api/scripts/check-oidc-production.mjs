import { fileURLToPath } from "node:url";

const DEFAULT_ORIGIN = "https://auth.cinaseek.ai";

export const evaluateOidcProtocol = ({ origin, canonical, alias, jwks }) => {
	const failures = [];
	const expectedOrigin = new URL(origin).origin;
	const expectedJwksUri = `${expectedOrigin}/api/auth/jwks`;
	const expectedEndpoints = {
		authorization_endpoint: `${expectedOrigin}/api/auth/oauth2/authorize`,
		token_endpoint: `${expectedOrigin}/api/auth/oauth2/token`,
		userinfo_endpoint: `${expectedOrigin}/api/auth/oauth2/userinfo`,
	};
	if (!canonical || typeof canonical !== "object") {
		failures.push("Canonical OIDC Discovery must return a JSON object");
		return failures;
	}
	if (!alias || typeof alias !== "object") {
		failures.push("OIDC Discovery compatibility alias must return a JSON object");
		return failures;
	}
	if (canonical.issuer !== expectedOrigin) {
		failures.push(`OIDC issuer must be ${expectedOrigin}`);
	}
	if (canonical.jwks_uri !== expectedJwksUri) {
		failures.push(`OIDC jwks_uri must be ${expectedJwksUri}`);
	}
	for (const [field, expected] of Object.entries(expectedEndpoints)) {
		if (canonical[field] !== expected) {
			failures.push(`OIDC ${field} must be ${expected}`);
		}
	}
	const algorithms = canonical.id_token_signing_alg_values_supported;
	if (!Array.isArray(algorithms) || !algorithms.includes("ES256")) {
		failures.push("OIDC Discovery must advertise ES256 ID token signing");
	}
	if (Array.isArray(algorithms) && algorithms.includes("EdDSA")) {
		failures.push("OIDC Discovery must not advertise EdDSA ID token signing");
	}
	for (const field of [
		"issuer",
		"jwks_uri",
		"authorization_endpoint",
		"token_endpoint",
		"userinfo_endpoint",
	]) {
		if (alias[field] !== canonical[field]) {
			failures.push(`OIDC compatibility alias differs at ${field}`);
		}
	}
	if (
		!jwks ||
		typeof jwks !== "object" ||
		!Array.isArray(jwks.keys) ||
		!jwks.keys.some(
			(key) =>
				key?.kty === "EC" && key?.crv === "P-256" && key?.alg === "ES256",
		)
	) {
		failures.push("JWKS must expose an EC P-256 key for ES256");
	}
	return failures;
};

const fetchJson = async (url) => {
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) {
		throw new Error(`${url} returned HTTP ${response.status}`);
	}
	return await response.json();
};

const main = async () => {
	const origin = new URL(process.env.CINAAUTH_URL || DEFAULT_ORIGIN).origin;
	const canonical = await fetchJson(
		`${origin}/.well-known/openid-configuration`,
	);
	const alias = await fetchJson(
		`${origin}/api/auth/.well-known/openid-configuration`,
	);
	const jwks = await fetchJson(canonical.jwks_uri);
	const failures = evaluateOidcProtocol({ origin, canonical, alias, jwks });
	if (failures.length > 0) {
		console.error("OIDC production verification failed:");
		for (const failure of failures) console.error(`- ${failure}`);
		process.exit(1);
	}
	console.log("OIDC production verification passed.");
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	await main();
}
