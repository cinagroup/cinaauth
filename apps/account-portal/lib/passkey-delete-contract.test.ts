import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const accountPasskeyCallSites = [
	new URL("../app/dashboard/security/security-center.tsx", import.meta.url),
	new URL("../app/dashboard/_components/user-card.tsx", import.meta.url),
];

describe("account passkey deletion call sites", () => {
	it.each(
		accountPasskeyCallSites,
	)("routes %s through the shared step-up-aware helper", (file) => {
		const source = readFileSync(fileURLToPath(file), "utf8");
		expect(source).toContain("deleteAccountPasskey");
		expect(source).not.toContain("authClient.passkey.deletePasskey");
	});
});
