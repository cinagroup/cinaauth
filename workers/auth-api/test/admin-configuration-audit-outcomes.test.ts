import { describe, expect, it, vi } from "vitest";
import type { AdminConfigurationDependencies } from "../src/admin-configuration";
import { handleAdminConfiguration } from "../src/admin-configuration";

const strongSecret = "s".repeat(48);

const stageBody = {
	expectedVersion: 0,
	idempotencyKey: "audit-outcome-0001",
	channel: "email" as const,
	config: {
		provider: "resend" as const,
		apiKey: "re_do-not-log-this-key",
		from: "CinaSeek <identity@example.com>",
	},
};

const makeDependencies = (fetchService: () => Promise<Response>) => {
	const auditEvents: unknown[] = [];
	const writeAudit = vi.fn(async (event: unknown) => {
		auditEvents.push(event);
	});
	const logEvent = vi.fn();
	const dependencies: AdminConfigurationDependencies = {
		getSession: async () => ({
			user: { id: "super-admin-1", role: "super_admin" },
			session: { createdAt: new Date(), impersonatedBy: null },
		}),
		consumeRateLimit: async () => ({ allowed: true, retryAfter: null }),
		resolveSecret: async () => strongSecret,
		fetchService,
		writeAudit,
		logEvent,
	};
	return { dependencies, auditEvents, writeAudit, logEvent };
};

const stage = (dependencies: AdminConfigurationDependencies) =>
	handleAdminConfiguration({
		dependencies,
		service: "delivery",
		action: "stage",
		origin: "https://admin.cinaseek.ai",
		readBody: async () => ({ ok: true, value: stageBody }),
	});

describe("admin configuration authoritative audit outcomes", () => {
	/**
	 * @see https://github.com/cinagroup/cinaauth/pull/1
	 */
	it("persists a redacted terminal failure after a safe upstream rejection", async () => {
		const fixture = makeDependencies(
			async () =>
				new Response(
					JSON.stringify({
						code: "revision_conflict",
						message: "Configuration changed; refresh and retry",
					}),
					{ status: 409, headers: { "Content-Type": "application/json" } },
				),
		);

		const result = await stage(fixture.dependencies);

		expect(result.status).toBe(409);
		expect(fixture.auditEvents).toEqual([
			expect.objectContaining({ phase: "requested", expectedVersion: 0 }),
			expect.objectContaining({
				phase: "failed",
				expectedVersion: 0,
				failureCode: "REVISION_CONFLICT",
				failureStatus: 409,
			}),
		]);
		expect(JSON.stringify(fixture.auditEvents)).not.toContain(
			stageBody.config.apiKey,
		);
		expect(JSON.stringify(fixture.auditEvents)).not.toContain(
			stageBody.config.from,
		);
	});

	/**
	 * @see https://github.com/cinagroup/cinaauth/pull/1
	 */
	it("persists a terminal failure when the fixed Service Binding call fails", async () => {
		const fixture = makeDependencies(async () => {
			throw new Error("binding unavailable");
		});

		const result = await stage(fixture.dependencies);

		expect(result.status).toBe(503);
		expect(fixture.auditEvents).toEqual([
			expect.objectContaining({ phase: "requested" }),
			expect.objectContaining({
				phase: "failed",
				failureCode: "CONFIGURATION_SERVICE_UNAVAILABLE",
				failureStatus: 503,
			}),
		]);
	});

	/**
	 * @see https://github.com/cinagroup/cinaauth/pull/1
	 */
	it("preserves the original failure when the terminal audit write fails", async () => {
		const fixture = makeDependencies(
			async () =>
				new Response(JSON.stringify({ code: "revision_conflict" }), {
					status: 409,
					headers: { "Content-Type": "application/json" },
				}),
		);
		fixture.writeAudit.mockImplementationOnce(async (event: unknown) => {
			fixture.auditEvents.push(event);
		});
		fixture.writeAudit.mockImplementationOnce(async () => {
			throw new Error("audit storage unavailable");
		});

		const result = await stage(fixture.dependencies);

		expect(result.status).toBe(409);
		expect(fixture.logEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "cinaauth.admin_configuration.failed",
				code: "AUDIT_TERMINAL_WRITE_FAILED",
			}),
		);
	});
});
