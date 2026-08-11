import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const STORE_ID = "346e2b4b86334bc29083c064116e91cf";

describe("Admin Secrets Store bindings", () => {
	it("pins every staged OIDC binding to the expected V2 secret", () => {
		const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as {
			secrets_store_secrets?: unknown;
		};

		expect(config.secrets_store_secrets).toEqual([
			{
				binding: "CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2",
				store_id: STORE_ID,
				secret_name: "CINAADMIN_OIDC_CLIENT_SECRET_V2",
			},
			{
				binding: "CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2",
				store_id: STORE_ID,
				secret_name: "CINAADMIN_OIDC_BRIDGE_SECRET_V2",
			},
			{
				binding: "CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2",
				store_id: STORE_ID,
				secret_name: "CINAADMIN_OIDC_TRANSACTION_SECRET_V2",
			},
		]);
	});
});
