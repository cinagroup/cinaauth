import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateDeployedWalletReadiness,
	evaluateEmailProviderReady,
	evaluatePasswordlessEmailRelease,
	evaluatePlannedReownBuild,
	evaluatePlannedSiweRelease,
	evaluateRedirectOAuthBuild,
	evaluateReownBuild,
	resolveAccountBuildReadinessTarget,
} from "./check-oauth-build.mjs";

const capabilities = (methods) => ({ version: 4, methods });

describe("passwordless email release parity", () => {
	it("allows the provider-first gate while the live password method is still enabled", () => {
		assert.deepEqual(
			evaluateEmailProviderReady({
				capabilities: capabilities({
					emailOtp: true,
					emailPassword: true,
					magicLink: true,
					username: true,
				}),
				cacheControl: "private, no-store",
			}),
			{
				ok: true,
				reason: "the production email OTP provider is active",
			},
		);
	});

	it("fails closed when the provider-first gate cannot prove email OTP readiness", () => {
		for (const value of [
			undefined,
			null,
			{},
			capabilities({ emailOtp: false }),
			capabilities({ emailOtp: "true" }),
		]) {
			const result = evaluateEmailProviderReady({
				capabilities: value,
				cacheControl: "no-store, max-age=0",
			});
			assert.equal(result.ok, false);
			assert.match(result.reason, /Email OTP/);
		}
	});

	it("rejects cacheable or unspecified capability responses", () => {
		const liveCapabilities = capabilities({ emailOtp: true });
		for (const cacheControl of [undefined, "", "public, max-age=60"]) {
			const result = evaluateEmailProviderReady({
				capabilities: liveCapabilities,
				cacheControl,
			});
			assert.equal(result.ok, false);
			assert.match(result.reason, /no-store/);
		}
	});

	it("accepts only the exact post-Auth passwordless email policy", () => {
		const exactMethods = {
			emailOtp: true,
			emailPassword: false,
			username: false,
			magicLink: false,
		};
		assert.equal(
			evaluatePasswordlessEmailRelease({
				capabilities: capabilities(exactMethods),
				cacheControl: "private, no-store",
			}).ok,
			true,
		);
		const cacheable = evaluatePasswordlessEmailRelease({
			capabilities: capabilities(exactMethods),
			cacheControl: "public, max-age=60",
		});
		assert.equal(cacheable.ok, false);
		assert.match(cacheable.reason, /no-store/);

		for (const methods of [
			{
				emailOtp: false,
				emailPassword: false,
				username: false,
				magicLink: false,
			},
			{
				emailOtp: true,
				emailPassword: true,
				username: false,
				magicLink: false,
			},
			{
				emailOtp: true,
				emailPassword: false,
				username: true,
				magicLink: false,
			},
			{
				emailOtp: true,
				emailPassword: false,
				username: false,
				magicLink: true,
			},
		]) {
			const result = evaluatePasswordlessEmailRelease({
				capabilities: capabilities(methods),
				cacheControl: "no-store",
			});
			assert.equal(result.ok, false);
			assert.match(result.reason, /passwordless email policy/);
		}
	});
});

describe("account OAuth build parity", () => {
	it("allows the redirect OAuth build when One Tap is disabled", () => {
		assert.equal(evaluateRedirectOAuthBuild({ oneTapEnabled: false }).ok, true);
	});

	it("rejects a production Auth Worker that still advertises One Tap", () => {
		const result = evaluateRedirectOAuthBuild({ oneTapEnabled: true });
		assert.equal(result.ok, false);
		assert.match(result.reason, /One Tap/);
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

describe("account build readiness target", () => {
	it("derives the readiness URL from an explicit canonical target origin", () => {
		assert.equal(
			resolveAccountBuildReadinessTarget({
				targetOrigin: "https://accounts-staging.example.com",
			}),
			"https://accounts-staging.example.com/api/build-readiness",
		);
	});

	it("rejects a readiness URL from a different deployment", () => {
		assert.throws(
			() =>
				resolveAccountBuildReadinessTarget({
					targetOrigin: "https://accounts-staging.example.com",
					readinessUrl: "https://accounts.cinaseek.ai/api/build-readiness",
				}),
			/deployment target/,
		);
	});

	it("fails closed on missing or non-canonical target origins", () => {
		for (const targetOrigin of [
			undefined,
			"http://accounts-staging.example.com",
			"https://accounts-staging.example.com/",
			"https://accounts-staging.example.com/path",
		]) {
			assert.throws(
				() => resolveAccountBuildReadinessTarget({ targetOrigin }),
				/CINAAUTH_ACCOUNT_TARGET_ORIGIN/,
			);
		}
	});
});
