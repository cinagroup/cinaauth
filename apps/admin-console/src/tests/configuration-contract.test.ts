import {
	parseConfigurationOperationResult,
	parseDeliveryConfigurationActivateInput,
	parseDeliveryConfigurationStageInput,
	parseDeliveryConfigurationStatus,
	parseErasureConfigurationStageInput,
	parseErasureConfigurationStatus,
	parseErasureConfigurationTestInput,
} from "@cinaauth/auth-web-contract";
import { describe, expect, it } from "vitest";

describe("post-deploy configuration contract", () => {
	it("accepts a write-only Resend stage request", () => {
		const result = parseDeliveryConfigurationStageInput({
			expectedVersion: 0,
			idempotencyKey: "stage-resend-20260811",
			channel: "email",
			config: {
				provider: "resend",
				apiKey: "re_example-secret-value",
				from: "CinaSeek <identity@example.com>",
			},
		});

		expect(result.ok).toBe(true);
	});

	it("accepts a write-only Cloudflare Email stage request", () => {
		const result = parseDeliveryConfigurationStageInput({
			expectedVersion: 0,
			idempotencyKey: "stage-cloudflare-20260817",
			channel: "email",
			config: {
				provider: "cloudflare-email",
				apiToken: "cf-email-token-abcdefghij1234",
				accountId: "f1234567890abcdef01234567890abcd",
				from: "CinaSeek <identity@example.com>",
			},
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.channel).toBe("email");
			expect(result.value.config.provider).toBe("cloudflare-email");
		}
	});

	it("rejects a Cloudflare Email stage with malformed credentials", () => {
		expect(
			parseDeliveryConfigurationStageInput({
				expectedVersion: 0,
				idempotencyKey: "stage-cloudflare-20260817",
				channel: "email",
				config: {
					provider: "cloudflare-email",
					apiToken: "short-token",
					accountId: "f1234567890abcdef01234567890abcd",
					from: "CinaSeek <identity@example.com>",
				},
			}),
		).toMatchObject({ ok: false });
		expect(
			parseDeliveryConfigurationStageInput({
				expectedVersion: 0,
				idempotencyKey: "stage-cloudflare-20260817",
				channel: "email",
				config: {
					provider: "cloudflare-email",
					apiToken: "cf-email-token-abcdefghij1234",
					accountId: "not-an-account-id",
					from: "CinaSeek <identity@example.com>",
				},
			}),
		).toMatchObject({ ok: false });
		expect(
			parseDeliveryConfigurationStageInput({
				expectedVersion: 0,
				idempotencyKey: "stage-cloudflare-20260817",
				channel: "email",
				config: {
					provider: "cloudflare-email",
					apiToken: "cf-email-token-abcdefghij1234",
					accountId: "f1234567890abcdef01234567890abcd",
					from: "CinaSeek <identity@example.com>",
					apiKey: "re_mixing-providers",
				},
			}),
		).toMatchObject({ ok: false });
	});

	it("rejects unknown fields and malformed provider credentials", () => {
		expect(
			parseDeliveryConfigurationStageInput({
				expectedVersion: 0,
				idempotencyKey: "stage-resend-20260811",
				channel: "email",
				config: {
					provider: "resend",
					apiKey: "short",
					from: "identity@example.com",
				},
				leak: true,
			}),
		).toMatchObject({ ok: false });
	});

	it("never accepts secret-bearing fields in a read status", () => {
		const status = {
			structuralReady: true,
			operationalState: "disabled",
			revision: 0,
			updatedAt: null,
			capabilities: { email: false, sms: false },
			channels: {
				email: {
					provider: "resend",
					configured: false,
					validated: false,
					activeVersion: null,
					nextVersion: null,
					previousVersion: null,
					updatedAt: null,
					lastTestedAt: null,
					apiKey: "must-not-cross-the-boundary",
				},
				sms: {
					provider: "twilio",
					configured: false,
					validated: false,
					activeVersion: null,
					nextVersion: null,
					previousVersion: null,
					updatedAt: null,
					lastTestedAt: null,
				},
			},
		};

		expect(parseDeliveryConfigurationStatus(status)).toMatchObject({
			ok: false,
		});
	});

	it("requires unique HTTPS erasure targets and strong write-only secrets", () => {
		const result = parseErasureConfigurationStageInput({
			expectedVersion: 4,
			idempotencyKey: "stage-erasure-20260811",
			targets: [
				{
					id: "cinashop",
					url: "https://api.cinashop.example/privacy/erase",
					signingSecret: "a-strong-signing-secret-with-32-characters",
				},
			],
		});

		expect(result.ok).toBe(true);
		expect(
			parseErasureConfigurationStageInput({
				...(result.ok ? result.value : {}),
				idempotencyKey: "stage-erasure-duplicate",
				targets: [
					{
						id: "cinashop",
						url: "https://api.cinashop.example/privacy/erase",
						signingSecret: "a-strong-signing-secret-with-32-characters",
					},
					{
						id: "cinashop",
						url: "http://localhost/erase",
						signingSecret: "a-strong-signing-secret-with-32-characters",
					},
				],
			}),
		).toMatchObject({ ok: false });
	});

	it("models erasure slots without exposing URLs or signing secrets", () => {
		const next = {
			version: 5,
			targetCount: 1,
			targetIds: ["cinashop"],
			validated: true,
			createdAt: "2026-08-11T00:00:00.000Z",
			lastTestedAt: "2026-08-11T00:01:00.000Z",
			activatedAt: null,
		};
		const input = {
			structuralReady: true,
			operationalState: "disabled",
			revision: 5,
			updatedAt: "2026-08-11T00:01:00.000Z",
			capabilities: { execution: false, verification: true },
			slots: { active: null, next, previous: null },
		};

		expect(parseErasureConfigurationStatus(input)).toMatchObject({ ok: true });
		expect(
			parseErasureConfigurationStatus({
				...input,
				slots: {
					...input.slots,
					next: { ...next, signingSecret: "must-not-cross" },
				},
			}),
		).toMatchObject({ ok: false });
	});

	it("tests all NEXT erasure targets as one activation gate", () => {
		expect(
			parseErasureConfigurationTestInput({
				expectedVersion: 5,
				idempotencyKey: "test-erasure-20260811",
			}),
		).toMatchObject({ ok: true });
		expect(
			parseErasureConfigurationTestInput({
				expectedVersion: 5,
				idempotencyKey: "test-erasure-20260811",
				targetId: "cinashop",
			}),
		).toMatchObject({ ok: false });
	});

	it("requires a channel for delivery activation", () => {
		expect(
			parseDeliveryConfigurationActivateInput({
				expectedVersion: 2,
				idempotencyKey: "activate-email-20260811",
				channel: "email",
				confirmation: "ACTIVATE",
			}),
		).toMatchObject({ ok: true });
		expect(
			parseDeliveryConfigurationActivateInput({
				expectedVersion: 2,
				idempotencyKey: "activate-email-20260811",
				confirmation: "ACTIVATE",
			}),
		).toMatchObject({ ok: false });
	});

	it("rejects reflected secrets in mutation acknowledgements", () => {
		const result = {
			operation: "stage",
			revision: 2,
			version: 2,
			validated: false,
			updatedAt: "2026-08-11T00:00:00.000Z",
		};
		expect(parseConfigurationOperationResult(result)).toMatchObject({
			ok: true,
		});
		expect(
			parseConfigurationOperationResult({
				...result,
				apiKey: "must-not-cross",
			}),
		).toMatchObject({ ok: false });
	});
});
