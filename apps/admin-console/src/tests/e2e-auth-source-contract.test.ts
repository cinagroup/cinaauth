import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const legacyScriptPaths = [
	"e2e/test.cjs",
	"e2e/test-full.cjs",
	"e2e/test-features.cjs",
] as const;

const require = createRequire(import.meta.url);
const authenticatedContext = require("../../e2e/authenticated-context.cjs") as {
	resolveStorageStatePath: (environment?: Record<string, string>) => string;
};

describe("Admin E2E authentication source contract", () => {
	it.each(
		legacyScriptPaths,
	)("%s never embeds credentials or calls the deleted password sign-in proxy", (scriptPath) => {
		const source = readFileSync(scriptPath, "utf8");

		expect(source).not.toContain("/api/auth/sign-in");
		expect(source).not.toMatch(/\b(?:EMAIL|PASSWORD)\s*=/);
		expect(source).not.toMatch(
			/["'`][A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}["'`]/i,
		);
		expect(source).not.toMatch(/\bpassword\s*:/i);
		expect(source).toContain("storageState");
		expect(source).toContain("createAuthenticatedContext");
	});

	it("requires an existing external storageState file before launching a context", () => {
		expect(() => authenticatedContext.resolveStorageStatePath({})).toThrow(
			"CINASEEK_ADMIN_E2E_STORAGE_STATE is required",
		);
		expect(() =>
			authenticatedContext.resolveStorageStatePath({
				CINASEEK_ADMIN_E2E_STORAGE_STATE: join(
					tmpdir(),
					"missing-cinaseek-admin-storage-state.json",
				),
			}),
		).toThrow("must point to an existing storageState file");
	});

	it("passes the external state path directly to Playwright newContext", () => {
		const helperSource = readFileSync("e2e/authenticated-context.cjs", "utf8");

		expect(helperSource).toContain(
			'const STORAGE_STATE_ENV = "CINASEEK_ADMIN_E2E_STORAGE_STATE"',
		);
		expect(helperSource).toContain("existsSync(storageState)");
		expect(helperSource).toContain(
			"browser.newContext({ ...options, storageState })",
		);
	});
});
