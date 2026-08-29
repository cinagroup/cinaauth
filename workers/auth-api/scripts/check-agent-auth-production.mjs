import { fileURLToPath } from "node:url";

const DEFAULT_ORIGIN = "https://auth.cinaseek.ai";
const PROFILE_CAPABILITY = "identity.profile.read";

const sameValues = (actual, expected) =>
	Array.isArray(actual) &&
	actual.length === expected.length &&
	actual.every((value, index) => value === expected[index]);

export const evaluateAgentAuthProtocol = ({
	origin,
	configuration,
	capabilityCatalog,
}) => {
	const failures = [];
	const expectedOrigin = new URL(origin).origin;
	const issuer = `${expectedOrigin}/api/auth`;
	const expectedEndpoints = {
		register: `${issuer}/agent/register`,
		capabilities: `${issuer}/capability/list`,
		execute: `${issuer}/capability/execute`,
		request_capability: `${issuer}/agent/request-capability`,
		status: `${issuer}/agent/status`,
		revoke: `${issuer}/agent/revoke`,
	};

	if (!configuration || typeof configuration !== "object") {
		failures.push("Agent Auth discovery must return a JSON object");
		return failures;
	}
	if (configuration.version !== "1.0-draft") {
		failures.push("Agent Auth discovery must advertise version 1.0-draft");
	}
	if (configuration.provider_name !== "CinaSeek Identity") {
		failures.push("Agent Auth provider must be CinaSeek Identity");
	}
	if (configuration.issuer !== issuer) {
		failures.push(`Agent Auth issuer must be ${issuer}`);
	}
	if (!sameValues(configuration.algorithms, ["Ed25519"])) {
		failures.push("Agent Auth must accept only Ed25519 host and agent keys");
	}
	if (!sameValues(configuration.modes, ["delegated"])) {
		failures.push("Agent Auth must expose delegated mode only");
	}
	if (!sameValues(configuration.approval_methods, ["device_authorization"])) {
		failures.push("Agent Auth must expose device authorization only");
	}
	for (const [field, expected] of Object.entries(expectedEndpoints)) {
		if (configuration.endpoints?.[field] !== expected) {
			failures.push(`Agent Auth endpoint ${field} must be ${expected}`);
		}
	}
	if (configuration.default_location !== expectedEndpoints.execute) {
		failures.push(
			"Agent Auth default location must be the capability executor",
		);
	}

	if (!capabilityCatalog || typeof capabilityCatalog !== "object") {
		failures.push("Agent Auth capability catalog must return a JSON object");
		return failures;
	}
	if (capabilityCatalog.has_more !== false) {
		failures.push("Agent Auth capability catalog must fit in one page");
	}
	if (
		!Array.isArray(capabilityCatalog.capabilities) ||
		capabilityCatalog.capabilities.length !== 1
	) {
		failures.push("Agent Auth must expose exactly one capability");
		return failures;
	}
	const [capability] = capabilityCatalog.capabilities;
	if (capability?.name !== PROFILE_CAPABILITY) {
		failures.push(`Agent Auth capability must be ${PROFILE_CAPABILITY}`);
	}
	if (capability?.approval_strength !== "session") {
		failures.push("Agent Auth profile access must require session approval");
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
	const configuration = await fetchJson(
		`${origin}/.well-known/agent-configuration`,
	);
	const capabilityCatalog = await fetchJson(
		`${origin}/api/auth/capability/list`,
	);
	const failures = evaluateAgentAuthProtocol({
		origin,
		configuration,
		capabilityCatalog,
	});
	if (failures.length > 0) {
		console.error("Agent Auth production verification failed:");
		for (const failure of failures) console.error(`- ${failure}`);
		process.exit(1);
	}
	console.log("Agent Auth production verification passed.");
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	await main();
}
