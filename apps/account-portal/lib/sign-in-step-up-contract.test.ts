import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("account step-up sign-in surface", () => {
	it("does not mount social providers or One Tap during step-up", () => {
		const source = readFileSync(
			new URL("../app/(auth)/sign-in/_components/sign-in.tsx", import.meta.url),
			"utf8",
		);
		const i18nSource = readFileSync(
			new URL("./i18n.ts", import.meta.url),
			"utf8",
		);

		expect(source).toContain("signInPolicy.allowFederatedProviders");
		expect(source).toContain("<OAuthProviderButtons");
		expect(source).toContain("messages.identityMethodsUnavailable");
		expect(i18nSource).toContain(
			"Automatic and social sign-in are unavailable for this identity check.",
		);
	});
});
