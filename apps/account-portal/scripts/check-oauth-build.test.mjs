import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateDeployedWalletReadiness,
	evaluateOneTapBuild,
	evaluatePlannedReownBuild,
	evaluatePlannedSiweRelease,
	evaluateReownBuild,
} from "./check-oauth-build.mjs";

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

describe("account Reown build parity", () => {
	it("allows a disabled production SIWE capability", () => {
		assert.equal(
			evaluateReownBuild({
				siweEnabled: false,
				reownProjectId: undefined,
			}).ok,
			true,
		);
	});

	it("requires a valid public project ID when production advertises SIWE", () => {
		for (const reownProjectId of [
			undefined,
			"",
			123,
			"not-a-project-id",
			" 0123456789abcdef0123456789abcdef",
		]) {
			const result = evaluateReownBuild({
				siweEnabled: true,
				reownProjectId,
			});
			assert.equal(result.ok, false);
			assert.match(result.reason, /REOWN_PROJECT_ID/);
		}
	});

	it("accepts paired SIWE and Reown build configuration", () => {
		assert.equal(
			evaluateReownBuild({
				siweEnabled: true,
				reownProjectId: "0123456789abcdef0123456789abcdef",
			}).ok,
			true,
		);
	});

	it("fails closed on an invalid planned SIWE switch", () => {
		for (const siweEnabled of [undefined, "", "TRUE", "enabled"]) {
			const result = evaluatePlannedReownBuild({
				siweEnabled,
				reownProjectId: "0123456789abcdef0123456789abcdef",
			});
			assert.equal(result.ok, false);
			assert.match(result.reason, /CINAAUTH_SIWE_ENABLED/);
		}
	});

	it("allows a planned disabled rollout without a project ID", () => {
		assert.equal(
			evaluatePlannedReownBuild({
				siweEnabled: "false",
				reownProjectId: undefined,
			}).ok,
			true,
		);
	});

	it("requires a project ID before a planned enabled rollout", () => {
		assert.equal(
			evaluatePlannedReownBuild({
				siweEnabled: "true",
				reownProjectId: undefined,
			}).ok,
			false,
		);
		assert.equal(
			evaluatePlannedReownBuild({
				siweEnabled: "true",
				reownProjectId: "0123456789abcdef0123456789abcdef",
			}).ok,
			true,
		);
	});

	it("blocks a first same-batch SIWE enable without a deployed v2 marker", () => {
		const result = evaluatePlannedSiweRelease({
			siweEnabled: "true",
			reownProjectId: "0123456789abcdef0123456789abcdef",
		});
		assert.equal(result.ok, false);
		assert.match(result.reason, /deployed Account Portal/);
	});

	it("rejects a deployed bundle built with a different Reown Project ID", () => {
		const result = evaluatePlannedSiweRelease({
			siweEnabled: "true",
			reownProjectId: "0123456789abcdef0123456789abcdef",
			deployedReadiness: {
				schemaVersion: 1,
				ready: true,
				siweProtocol: "cinaauth-siwe-v2",
				walletUi: "reown-appkit-v1",
				reownProjectId: "fedcba9876543210fedcba9876543210",
			},
			cacheControl: "no-store",
		});
		assert.equal(result.ok, false);
		assert.match(result.reason, /does not match/);
	});

	it("accepts the exact deployed v2 bundle marker for a later SIWE enable", () => {
		const reownProjectId = "0123456789abcdef0123456789abcdef";
		const deployedReadiness = {
			schemaVersion: 1,
			ready: true,
			siweProtocol: "cinaauth-siwe-v2",
			walletUi: "reown-appkit-v1",
			reownProjectId,
		};
		assert.equal(
			evaluateDeployedWalletReadiness({
				deployedReadiness,
				cacheControl: "private, no-store",
				reownProjectId,
			}).ok,
			true,
		);
		assert.equal(
			evaluatePlannedSiweRelease({
				siweEnabled: "true",
				reownProjectId,
				deployedReadiness,
				cacheControl: "private, no-store",
			}).ok,
			true,
		);
	});

	it("rejects a cacheable deployed bundle marker", () => {
		const reownProjectId = "0123456789abcdef0123456789abcdef";
		const result = evaluateDeployedWalletReadiness({
			deployedReadiness: {
				schemaVersion: 1,
				ready: true,
				siweProtocol: "cinaauth-siwe-v2",
				walletUi: "reown-appkit-v1",
				reownProjectId,
			},
			cacheControl: "public, max-age=60",
			reownProjectId,
		});
		assert.equal(result.ok, false);
		assert.match(result.reason, /not no-store/);
	});

	it("does not require a deployed marker while planned SIWE remains disabled", () => {
		assert.equal(
			evaluatePlannedSiweRelease({
				siweEnabled: "false",
				reownProjectId: undefined,
			}).ok,
			true,
		);
	});
});
