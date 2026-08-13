import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CloudflareBindings } from "../src/env";
import { createAuthPlugins } from "../src/plugins";

describe("CinaSeek runtime brand contract", () => {
	it("uses the CinaSeek name in WebAuthn prompts", () => {
		const plugin = createAuthPlugins({} as CloudflareBindings).find(
			(candidate) => candidate.id === "passkey",
		);

		expect(plugin?.options).toMatchObject({
			rpID: "cinaseek.ai",
			rpName: "CinaSeek",
			origin: ["https://accounts.cinaseek.ai"],
		});
	});

	it("uses CinaSeek Identity in public OpenAPI metadata", () => {
		const plugin = createAuthPlugins({} as CloudflareBindings).find(
			(candidate) => candidate.id === "open-api",
		);

		expect(plugin?.options).toMatchObject({
			title: "CinaSeek Identity",
			description: "CinaSeek identity and access management API",
		});
	});

	it("uses the CinaSeek Identity name in the public Worker root response", () => {
		const source = readFileSync("src/index.ts", "utf8");

		expect(source).toContain('name: "CinaSeek Identity API"');
		expect(source).not.toContain('name: "CinaAuth API"');
	});
});
