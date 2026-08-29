import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateConfigurableAuthenticationRelease,
	evaluateDeployedWalletReadiness,
	evaluateGoogleAuthenticationBuild,
	evaluatePlannedReownBuild,
	evaluatePlannedSiweRelease,
	evaluatePortalCompatibility,
	evaluateReownBuild,
	resolveAccountBuildReadinessTarget,
} from "./check-oauth-build.mjs";

const capabilities = (methods, overrides = {}) => ({
	version: 5,
	methods,
	oauthProviders: [],
	oneTap: false,
	oneTapClientId: null,
	...overrides,
});

describe("authentication capability release parity", () => {
	it("allows the read-only preflight across capability versions 4 and 5", () => {
		assert.deepEqual(
			evaluatePortalCompatibility({
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
				reason:
					"the live Auth capability is compatible with the planned Account Portal",
			},
		);
		assert.equal(
			evaluatePortalCompatibility({
				capabilities: {
					version: 4,
					methods: { emailOtp: false },
				},
				cacheControl: "no-store",
			}).ok,
			true,
		);
	});

	it("fails closed when the preflight cannot prove portal compatibility", () => {
		for (const value of [
			undefined,
			null,
			{},
			capabilities({ emailOtp: "false" }),
			capabilities({ emailOtp: "true" }),
		]) {
			const result = evaluatePortalCompatibility({
				capabilities: value,
				cacheControl: "no-store, max-age=0",
			});
			assert.equal(result.ok, false);
			assert.match(result.reason, /compatible/);
		}
	});

	it("rejects cacheable or unspecified capability responses", () => {
		const liveCapabilities = capabilities({ emailOtp: true });
		for (const cacheControl of [undefined, "", "public, max-age=60"]) {
			const result = evaluatePortalCompatibility({
				capabilities: liveCapabilities,
				cacheControl,
			});
			assert.equal(result.ok, false);
			assert.match(result.reason, /no-store/);
		}
	});

	it("accepts the runtime-configurable v5 authentication contract", () => {
		const configurableMethods = {
			emailOtp: true,
			emailPassword: true,
			phoneOtp: false,
			passkey: true,
			anonymous: true,
			twoFactor: true,
			siwe: true,
			sso: true,
			username: false,
			magicLink: false,
		};
		assert.equal(
			evaluateConfigurableAuthenticationRelease({
				capabilities: capabilities(configurableMethods),
				cacheControl: "private, no-store",
			}).ok,
			true,
		);
		const cacheable = evaluateConfigurableAuthenticationRelease({
			capabilities: capabilities(configurableMethods),
			cacheControl: "public, max-age=60",
		});
		assert.equal(cacheable.ok, false);
		assert.match(cacheable.reason, /no-store/);

		for (const methods of [
			{
				...configurableMethods,
				username: true,
			},
			{
				...configurableMethods,
				magicLink: true,
			},
			{ ...configurableMethods, passkey: "true" },
		]) {
			const result = evaluateConfigurableAuthenticationRelease({
				capabilities: capabilities(methods),
				cacheControl: "no-store",
			});
			assert.equal(result.ok, false);
			assert.match(result.reason, /runtime-configurable/);
		}
	});

	it("requires complete Google configuration when One Tap is enabled", () => {
		const methods = {
			emailOtp: true,
			emailPassword: false,
			phoneOtp: false,
			passkey: false,
			anonymous: true,
			twoFactor: true,
			siwe: false,
			sso: true,
			username: false,
			magicLink: false,
		};
		const incomplete = evaluateConfigurableAuthenticationRelease({
			capabilities: capabilities(methods, { oneTap: true }),
			cacheControl: "no-store",
		});
		assert.equal(incomplete.ok, false);

		const configured = evaluateConfigurableAuthenticationRelease({
			capabilities: capabilities(methods, {
				oneTap: true,
				oneTapClientId: "google-client-id",
				oauthProviders: [{ id: "google", type: "social" }],
			}),
			cacheControl: "no-store",
		});
		assert.equal(configured.ok, true);
	});
});

describe("account OAuth build parity", () => {
	it("allows the redirect OAuth build when One Tap is disabled", () => {
		assert.equal(
			evaluateGoogleAuthenticationBuild({
				capabilities: capabilities({}),
			}).ok,
			true,
		);
	});

	it("accepts One Tap only with a Google provider and public client id", () => {
		const incomplete = evaluateGoogleAuthenticationBuild({
			capabilities: capabilities({}, { oneTap: true }),
		});
		assert.equal(incomplete.ok, false);
		assert.match(incomplete.reason, /incomplete Google One Tap/);

		const configured = evaluateGoogleAuthenticationBuild({
			capabilities: capabilities(
				{},
				{
					oneTap: true,
					oneTapClientId: "google-client-id",
					oauthProviders: [{ id: "google", type: "social" }],
				},
			),
		});
		assert.equal(configured.ok, true);
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
