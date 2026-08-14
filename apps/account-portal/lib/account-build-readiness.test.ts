import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildAccountBuildReadiness,
	createAccountBuildReadinessResponse,
} from "./account-build-readiness";

describe("Account Portal build readiness", () => {
	it("keeps helper exports out of the App Router route module", () => {
		const route = readFileSync(
			new URL("../app/api/build-readiness/route.ts", import.meta.url),
			"utf8",
		);
		expect(route).not.toContain("export const buildAccountBuildReadiness");
		expect(route).not.toContain(
			"export const createAccountBuildReadinessResponse",
		);
		expect(route).not.toContain('export const runtime = "edge"');
	});
	it("advertises the exact public Project ID for a compatible v2 bundle", () => {
		expect(
			buildAccountBuildReadiness("0123456789abcdef0123456789abcdef", "false"),
		).toEqual({
			schemaVersion: 1,
			ready: true,
			siweProtocol: "cinaauth-siwe-v2",
			walletUi: "reown-appkit-v1",
			walletUiEnabled: false,
			reownProjectId: "0123456789abcdef0123456789abcdef",
		});
	});

	it("fails closed when the bundle has no exact Project ID", () => {
		for (const projectId of [
			undefined,
			"",
			"not-a-project-id",
			" 0123456789abcdef0123456789abcdef",
		]) {
			expect(buildAccountBuildReadiness(projectId, "false")).toMatchObject({
				ready: false,
				reownProjectId: null,
			});
		}
	});

	it("returns an explicit no-store marker and a fail-closed status", async () => {
		const unavailable = createAccountBuildReadinessResponse(
			undefined,
			undefined,
		);
		expect(unavailable.status).toBe(503);
		expect(unavailable.headers.get("cache-control")).toContain("no-store");
		expect(unavailable.headers.get("cdn-cache-control")).toBe("no-store");

		const ready = createAccountBuildReadinessResponse(
			"0123456789abcdef0123456789abcdef",
			"false",
		);
		expect(ready.status).toBe(200);
		expect(await ready.json()).toMatchObject({ ready: true });
	});

	it("only reports wallet UI enabled for the exact tracked build flag", () => {
		const projectId = "0123456789abcdef0123456789abcdef";
		expect(buildAccountBuildReadiness(projectId, "true").walletUiEnabled).toBe(
			true,
		);
		expect(buildAccountBuildReadiness(projectId, "false").walletUiEnabled).toBe(
			false,
		);
		expect(
			buildAccountBuildReadiness(projectId, undefined).walletUiEnabled,
		).toBe(false);
	});
});
