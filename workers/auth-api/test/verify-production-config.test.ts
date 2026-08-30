import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const verifierFile = fileURLToPath(
	new URL("../scripts/verify-production-config.mjs", import.meta.url),
);

describe("production configuration verifier", () => {
	it("accepts localized Account Portal safety copy contracts", () => {
		const output = execFileSync(process.execPath, [verifierFile], {
			encoding: "utf8",
		});

		expect(output).toContain("Production config verification passed");
	});
});
