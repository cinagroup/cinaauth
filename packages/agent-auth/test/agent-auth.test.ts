import { getTestInstance } from "cinaauth/test";
import { describe, expect, it } from "vitest";
import { agentAuth } from "../src";

describe("agent-auth compatibility", async () => {
	const { auth } = await getTestInstance({
		plugins: [
			agentAuth({
				providerName: "CinaAuth Test",
				modes: ["delegated"],
				approvalMethods: ["device_authorization"],
				allowDynamicHostRegistration: true,
				capabilities: [
					{
						name: "identity.profile.read",
						description: "Read a basic identity profile.",
					},
				],
			}),
		],
	});

	it("serves restricted Agent Auth discovery through CinaAuth", async () => {
		const response = await auth.handler(
			new Request("http://localhost:3000/api/auth/agent-configuration"),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			provider_name: "CinaAuth Test",
			modes: ["delegated"],
			approval_methods: ["device_authorization"],
			endpoints: {
				register: "http://localhost:3000/api/auth/agent/register",
				execute: "http://localhost:3000/api/auth/capability/execute",
			},
		});
	});

	it("installs all Agent Auth persistence tables", async () => {
		const context = await auth.$context;
		expect(Object.keys(context.tables)).toEqual(
			expect.arrayContaining([
				"agentHost",
				"agent",
				"agentCapabilityGrant",
				"approvalRequest",
			]),
		);
	});
});
