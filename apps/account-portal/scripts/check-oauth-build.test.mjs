import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateOneTapBuild } from "./check-oauth-build.mjs";

describe("account OAuth build parity", () => {
	it("allows a disabled production One Tap capability", () => {
		assert.equal(
			evaluateOneTapBuild({ oneTapEnabled: false, googleClientId: undefined })
				.ok,
			true,
		);
	});

	it("requires the client build ID when production advertises One Tap", () => {
		const result = evaluateOneTapBuild({
			oneTapEnabled: true,
			googleClientId: undefined,
		});
		assert.equal(result.ok, false);
		assert.match(result.reason, /no GOOGLE_CLIENT_ID/);
	});

	it("accepts a paired server and client configuration", () => {
		assert.equal(
			evaluateOneTapBuild({
				oneTapEnabled: true,
				googleClientId: "google-client-id",
			}).ok,
			true,
		);
	});
});
