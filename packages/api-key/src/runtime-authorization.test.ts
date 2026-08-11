import { getTestInstance } from "cinaauth/test";
import { describe, expect, it } from "vitest";
import { apiKey } from ".";

describe("API key runtime authorization", () => {
	it("denies an otherwise valid key before consuming usage state", async () => {
		let authorization:
			| { apiKeyId: string; configId: string; referenceId: string }
			| undefined;
		const { auth, signInWithTestUser } = await getTestInstance({
			plugins: [
				apiKey({
					authorizeReference: async ({ apiKeyId, configId, referenceId }) => {
						authorization = { apiKeyId, configId, referenceId };
						return false;
					},
				}),
			],
		});
		const { headers, user } = await signInWithTestUser();
		const created = await auth.api.createApiKey({
			body: { userId: user.id, remaining: 2 },
		});

		const result = await auth.api.verifyApiKey({
			body: { key: created.key },
		});
		expect(result.valid).toBe(false);
		expect(authorization).toEqual({
			apiKeyId: created.id,
			configId: "default",
			referenceId: user.id,
		});

		const stored = await auth.api.getApiKey({
			query: { id: created.id },
			headers,
		});
		expect(stored.remaining).toBe(2);
		expect(stored.lastRequest).toBeNull();
	});
});
