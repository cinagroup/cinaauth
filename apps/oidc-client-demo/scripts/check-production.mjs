import assert from "node:assert/strict";

const appOrigin = "https://oidc-demo.cinaseek.ai";
const issuer = "https://auth.cinaseek.ai";
const clientId = "cinaauth-oidc-demo";
const redirectUri = `${appOrigin}/callback`;

const fetchOk = async (url, init) => {
	const response = await fetch(url, init);
	assert.equal(response.ok, true, `${url} returned ${response.status}`);
	return response;
};

const health = await fetchOk(`${appOrigin}/health`);
assert.deepEqual(await health.json(), {
	status: "ok",
	service: "cinaauth-oidc-demo",
});

const configResponse = await fetchOk(`${appOrigin}/config.json`);
const config = await configResponse.json();
assert.equal(config.issuer, issuer);
assert.equal(config.clientId, clientId);
assert.equal(config.redirectUri, redirectUri);

const app = await fetchOk(appOrigin);
assert.match(await app.text(), /CinaSeek OIDC Lab/);
assert.match(
	app.headers.get("content-security-policy") || "",
	/frame-ancestors 'none'/,
);

const discoveryResponse = await fetchOk(
	`${issuer}/.well-known/openid-configuration`,
);
const discovery = await discoveryResponse.json();
assert.equal(discovery.issuer, issuer);
assert.ok(discovery.token_endpoint_auth_methods_supported.includes("none"));
assert.ok(discovery.code_challenge_methods_supported.includes("S256"));
assert.ok(discovery.id_token_signing_alg_values_supported.includes("ES256"));

const corsResponse = await fetch(discovery.token_endpoint, {
	method: "OPTIONS",
	headers: {
		Origin: appOrigin,
		"Access-Control-Request-Method": "POST",
		"Access-Control-Request-Headers": "content-type",
	},
});
assert.equal(
	corsResponse.headers.get("access-control-allow-origin"),
	appOrigin,
);

const authorizationUrl = new URL(discovery.authorization_endpoint);
authorizationUrl.searchParams.set("client_id", clientId);
authorizationUrl.searchParams.set("redirect_uri", redirectUri);
authorizationUrl.searchParams.set("response_type", "code");
authorizationUrl.searchParams.set("scope", "openid profile email");
authorizationUrl.searchParams.set("code_challenge", "A".repeat(43));
authorizationUrl.searchParams.set("code_challenge_method", "S256");
authorizationUrl.searchParams.set("state", "online-acceptance-state");
authorizationUrl.searchParams.set("nonce", "online-acceptance-nonce");
const authorization = await fetch(authorizationUrl, { redirect: "manual" });
assert.ok(
	[302, 303, 307, 308].includes(authorization.status),
	`authorize returned ${authorization.status}`,
);
const location = authorization.headers.get("location") || "";
assert.match(
	location,
	/^https:\/\/accounts\.cinaseek\.ai\/(sign-in|oauth\/consent)/,
);
assert.doesNotMatch(location, /[?&]error=/);

console.log(
	JSON.stringify({
		ok: true,
		appOrigin,
		issuer,
		clientId,
		checks: [
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
