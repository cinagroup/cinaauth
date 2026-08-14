import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveOidcDemoProfile } from "../../../packages/auth-web-contract/src/oidc-demo.ts";

export const resolveProductionTargetOrigin = (value) => {
	if (typeof value !== "string" || !value || value.trim() !== value) {
		throw new Error(
			"CINAAUTH_OIDC_DEMO_TARGET_ORIGIN must be an exact canonical HTTPS target origin",
		);
	}
	let url;
	try {
		url = new URL(value);
	} catch {
		throw new Error(
			"CINAAUTH_OIDC_DEMO_TARGET_ORIGIN must be an exact canonical HTTPS target origin",
		);
	}
	if (
		url.protocol !== "https:" ||
		url.username ||
		url.password ||
		url.port ||
		url.pathname !== "/" ||
		url.search ||
		url.hash ||
		url.origin !== value
	) {
		throw new Error(
			"CINAAUTH_OIDC_DEMO_TARGET_ORIGIN must be an exact canonical HTTPS target origin",
		);
	}
	return url.origin;
};

export const resolveProductionAcceptanceProfile = ({
	targetOrigin,
	profileInput,
}) => {
	const profile = resolveOidcDemoProfile(profileInput);
	if (profile.environment !== "production") {
		throw new Error("OIDC production acceptance requires a production profile");
	}
	if (profile.applicationOrigin !== targetOrigin) {
		throw new Error(
			"OIDC production profile does not match the explicit acceptance target origin",
		);
	}
	return profile;
};

export const runProductionAcceptance = async ({
	targetOrigin,
	fetchImpl = fetch,
	log = console.log,
}) => {
	const fetchOk = async (url, init) => {
		const response = await fetchImpl(url, init);
		assert.equal(response.ok, true, `${url} returned ${response.status}`);
		return response;
	};

	const configResponse = await fetchOk(`${targetOrigin}/config.json`, {
		cache: "no-store",
		headers: { Accept: "application/json" },
	});
	const profile = resolveProductionAcceptanceProfile({
		targetOrigin,
		profileInput: await configResponse.json(),
	});

	const health = await fetchOk(`${targetOrigin}/health`);
	assert.deepEqual(await health.json(), {
		status: "ok",
		service: "cinaauth-oidc-demo",
		environment: profile.environment,
	});

	const app = await fetchOk(targetOrigin);
	assert.match(await app.text(), /CinaSeek OIDC Lab/);
	const contentSecurityPolicy =
		app.headers.get("content-security-policy") || "";
	assert.match(contentSecurityPolicy, /frame-ancestors 'none'/);
	assert.ok(contentSecurityPolicy.includes(profile.issuer));
	assert.ok(contentSecurityPolicy.includes(profile.accountOrigin));

	const discoveryResponse = await fetchOk(
		`${profile.issuer}/.well-known/openid-configuration`,
	);
	const discovery = await discoveryResponse.json();
	assert.equal(discovery.issuer, profile.issuer);
	assert.ok(discovery.token_endpoint_auth_methods_supported.includes("none"));
	assert.ok(discovery.code_challenge_methods_supported.includes("S256"));
	assert.ok(discovery.id_token_signing_alg_values_supported.includes("ES256"));

	const corsResponse = await fetchImpl(discovery.token_endpoint, {
		method: "OPTIONS",
		headers: {
			Origin: profile.applicationOrigin,
			"Access-Control-Request-Method": "POST",
			"Access-Control-Request-Headers": "content-type",
		},
	});
	assert.equal(
		corsResponse.headers.get("access-control-allow-origin"),
		profile.applicationOrigin,
	);

	const authorizationUrl = new URL(discovery.authorization_endpoint);
	authorizationUrl.searchParams.set("client_id", profile.clientId);
	authorizationUrl.searchParams.set("redirect_uri", profile.redirectUri);
	authorizationUrl.searchParams.set("response_type", "code");
	authorizationUrl.searchParams.set("scope", profile.scope);
	authorizationUrl.searchParams.set("code_challenge", "A".repeat(43));
	authorizationUrl.searchParams.set("code_challenge_method", "S256");
	authorizationUrl.searchParams.set("state", "online-acceptance-state");
	authorizationUrl.searchParams.set("nonce", "online-acceptance-nonce");
	const authorization = await fetchImpl(authorizationUrl, {
		redirect: "manual",
	});
	assert.ok(
		[302, 303, 307, 308].includes(authorization.status),
		`authorize returned ${authorization.status}`,
	);
	const location = authorization.headers.get("location") || "";
	const authorizationTarget = new URL(location);
	assert.equal(authorizationTarget.origin, profile.accountOrigin);
	assert.match(authorizationTarget.pathname, /^\/(sign-in|oauth\/consent)/);
	assert.doesNotMatch(location, /[?&]error=/);

	log(
		JSON.stringify({
			ok: true,
			appOrigin: profile.applicationOrigin,
			issuer: profile.issuer,
			clientId: profile.clientId,
			checks: [
				"runtime_profile",
				"static_assets",
				"security_headers",
				"oidc_discovery",
				"public_client_metadata",
				"pkce_s256",
				"es256",
				"cors",
				"authorize_redirect",
			],
		}),
	);
};

const main = async () => {
	const targetOrigin = resolveProductionTargetOrigin(
		process.env.CINAAUTH_OIDC_DEMO_TARGET_ORIGIN,
	);
	await runProductionAcceptance({ targetOrigin });
};

if (
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
	main().catch((error) => {
		console.error(
			`OIDC production acceptance failed: ${error instanceof Error ? error.message : "unknown error"}`,
		);
		process.exitCode = 1;
	});
}
