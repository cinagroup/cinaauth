import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildDeviceFlowPath,
	getDeviceFlowResponseError,
} from "./device-authorization-flow";

const readSource = (relativePath: string) =>
	readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("Accounts device authorization flow", () => {
	it("classifies a resolved BetterFetch error before navigation", () => {
		expect(
			getDeviceFlowResponseError(
				{
					error: {
						error: "expired_token",
						error_description: "Device request expired",
					},
				},
				"Fallback",
			),
		).toBe("Device request expired");
		expect(getDeviceFlowResponseError({ error: null }, "Fallback")).toBeNull();

		const verifyPageSource = readSource("../app/(auth)/device/page.tsx");
		const decisionPageSource = readSource(
			"../app/(auth)/device/approve/page.tsx",
		);

		expect(verifyPageSource).toContain("getDeviceFlowResponseError(");
		expect(
			decisionPageSource.match(/getDeviceFlowResponseError\(/g),
		).toHaveLength(2);
		expect(decisionPageSource).not.toContain("catch (err: any)");
	});

	it("shares one pending state across approve and deny", () => {
		const decisionPageSource = readSource(
			"../app/(auth)/device/approve/page.tsx",
		);

		expect(decisionPageSource).toContain(
			"const [isPending, startTransition] = useTransition();",
		);
		expect(decisionPageSource).not.toContain("isApprovePending");
		expect(decisionPageSource).not.toContain("isDenyPending");
		expect(decisionPageSource.match(/disabled=\{isPending\}/g)).toHaveLength(2);
	});

	it("preserves callbackURL and the device query between device pages", () => {
		const params = new URLSearchParams({
			callbackURL: "/device?user_code=ABCD-1234",
			client_id: "device-client",
		});
		const path = new URL(
			buildDeviceFlowPath("/device/approve", params, "TEST-5678"),
			"https://accounts.cinaseek.ai",
		);

		expect(path.pathname).toBe("/device/approve");
		expect(path.searchParams.get("callbackURL")).toBe(
			"/device?user_code=ABCD-1234",
		);
		expect(path.searchParams.get("client_id")).toBe("device-client");
		expect(path.searchParams.get("user_code")).toBe("TEST-5678");

		const verifyPageSource = readSource("../app/(auth)/device/page.tsx");
		const decisionPageSource = readSource(
			"../app/(auth)/device/approve/page.tsx",
		);

		expect(verifyPageSource).toContain("buildDeviceFlowPath");
		expect(decisionPageSource).toContain("buildDeviceFlowPath");
	});
});
