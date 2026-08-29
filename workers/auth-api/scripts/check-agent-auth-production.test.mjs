import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateAgentAuthProtocol } from "./check-agent-auth-production.mjs";

const origin = "https://auth.cinaseek.ai";
const issuer = `${origin}/api/auth`;
const configuration = {
	version: "1.0-draft",
	provider_name: "CinaSeek Identity",
	issuer,
	default_location: `${issuer}/capability/execute`,
	algorithms: ["Ed25519"],
	modes: ["delegated"],
	approval_methods: ["device_authorization"],
	endpoints: {
		register: `${issuer}/agent/register`,
		capabilities: `${issuer}/capability/list`,
		execute: `${issuer}/capability/execute`,
		request_capability: `${issuer}/agent/request-capability`,
		status: `${issuer}/agent/status`,
		revoke: `${issuer}/agent/revoke`,
	},
};
const capabilityCatalog = {
	capabilities: [
		{
			name: "identity.profile.read",
			description: "Read the approved user's basic identity profile.",
			approval_strength: "session",
		},
	],
	has_more: false,
};

describe("Agent Auth production protocol checks", () => {
	it("accepts the delegated, user-approved profile policy", () => {
		assert.deepEqual(
			evaluateAgentAuthProtocol({
				origin,
				configuration,
				capabilityCatalog,
			}),
			[],
		);
	});

	it("rejects autonomous access and broader capabilities", () => {
		const failures = evaluateAgentAuthProtocol({
			origin,
			configuration: {
				...configuration,
				modes: ["delegated", "autonomous"],
				approval_methods: ["device_authorization", "ciba"],
			},
			capabilityCatalog: {
				capabilities: [
					...capabilityCatalog.capabilities,
					{ name: "account.delete", approval_strength: "session" },
				],
				has_more: false,
			},
		});

		assert.match(failures.join("\n"), /delegated mode only/);
		assert.match(failures.join("\n"), /device authorization only/);
		assert.match(failures.join("\n"), /exactly one capability/);
	});

	it("rejects discovery endpoints outside the Auth API", () => {
		const failures = evaluateAgentAuthProtocol({
			origin,
			configuration: {
				...configuration,
				issuer: "https://agent.example",
				endpoints: {
					...configuration.endpoints,
					execute: "https://agent.example/execute",
				},
			},
			capabilityCatalog,
		});

		assert.match(failures.join("\n"), /issuer must be/);
		assert.match(failures.join("\n"), /endpoint execute must be/);
	});
});
