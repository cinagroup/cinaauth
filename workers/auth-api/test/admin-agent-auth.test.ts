import { describe, expect, it, vi } from "vitest";
import type {
	AdminAgentAuthDependencies,
	AdminAgentAuthResource,
} from "../src/admin-agent-auth";
import {
	handleAdminAgentAuthMutation,
	handleAdminGetAgentAuth,
} from "../src/admin-agent-auth";
import type { CinaAuthDatabase } from "../src/database";

const ADMIN_ORIGIN = "https://admin.cinaseek.ai";

type QueryResult = {
	rows?: Record<string, unknown>[];
	rowCount?: number;
};

const makeDatabase = () => {
	const query = vi.fn(async (text: string): Promise<QueryResult> => {
		if (text.includes('AS "activeAgentCount"')) {
			return {
				rows: [
					{
						agentCount: 2,
						activeAgentCount: 1,
						hostCount: 1,
						activeHostCount: 1,
						grantCount: 1,
						pendingApprovalCount: 1,
					},
				],
			};
		}
		if (text.includes('FROM "agent" AS "agent"')) {
			return {
				rows: [
					{
						id: "agent-1",
						name: "Research Agent",
						userId: "user-1",
						ownerName: "Owner",
						ownerEmail: "owner@example.com",
						hostId: "host-1",
						hostName: "Desktop Host",
						status: "active",
						mode: "delegated",
						grantCount: 1,
						pendingApprovalCount: 0,
					},
				],
			};
		}
		if (text.includes('FROM "agentHost" AS "host"')) {
			return {
				rows: [
					{
						id: "host-1",
						name: "Desktop Host",
						userId: "user-1",
						ownerName: "Owner",
						ownerEmail: "owner@example.com",
						status: "active",
						agentCount: 1,
					},
				],
			};
		}
		if (text.includes('FROM "agentCapabilityGrant" AS "grant"')) {
			return {
				rows: [
					{
						id: "grant-1",
						agentId: "agent-1",
						agentName: "Research Agent",
						capability: "identity.profile.read",
						status: "active",
					},
				],
			};
		}
		if (text.includes('FROM "approvalRequest" AS "approval"')) {
			return {
				rows: [
					{
						id: "approval-1",
						agentId: "agent-1",
						agentName: "Research Agent",
						hostId: "host-1",
						hostName: "Desktop Host",
						status: "pending",
						method: "device_authorization",
						capabilities: '["identity.profile.read"]',
					},
				],
			};
		}
		return { rows: [], rowCount: 0 };
	});
	const clientQuery = vi.fn(
		async (text: string): Promise<QueryResult> =>
			text.includes("RETURNING")
				? { rows: [{ id: "target-1" }], rowCount: 1 }
				: { rows: [], rowCount: 1 },
	);
	const connect = vi.fn(async () => ({
		query: clientQuery,
		release: vi.fn(),
	}));
	return {
		database: { query, connect } as unknown as CinaAuthDatabase,
		query,
		connect,
		clientQuery,
	};
};

const makeDependencies = (
	role: string | null = "super_admin",
	options: {
		createdAt?: Date;
		impersonatedBy?: string | null;
		allowed?: boolean;
	} = {},
) => {
	const database = makeDatabase();
	const dependencies: AdminAgentAuthDependencies = {
		database: database.database,
		getSession: vi.fn(async () =>
			role === null
				? null
				: {
						user: { id: "admin-1", role },
						session: {
							createdAt: options.createdAt ?? new Date(),
							impersonatedBy: options.impersonatedBy ?? null,
						},
					},
		),
		consumeRateLimit: vi.fn(async () => ({
			allowed: options.allowed ?? true,
			retryAfter: options.allowed === false ? 30 : null,
		})),
		writeAuditEvent: vi.fn(async () => undefined),
		logEvent: vi.fn(),
	};
	return { dependencies, ...database };
};

describe("Admin Agent Auth control plane", () => {
	it("returns a redacted policy, inventory, grants, and pending approvals", async () => {
		const fixture = makeDependencies("security_admin");
		const result = await handleAdminGetAgentAuth(fixture.dependencies, 25);

		expect(result.status).toBe(200);
		expect(result.body).toMatchObject({
			ok: true,
			data: {
				policy: {
					enabled: true,
					modes: ["delegated"],
					approvalMethods: ["device_authorization"],
					maxAgentsPerUser: 10,
				},
				summary: { agentCount: 2, pendingApprovalCount: 1 },
				agents: [{ id: "agent-1", ownerEmail: "owner@example.com" }],
				hosts: [{ id: "host-1", agentCount: 1 }],
				grants: [{ id: "grant-1", capability: "identity.profile.read" }],
				approvals: [
					{
						id: "approval-1",
						capabilities: ["identity.profile.read"],
					},
				],
				limit: 25,
			},
		});
		const serialized = JSON.stringify(result.body);
		expect(serialized).not.toContain("publicKey");
		expect(serialized).not.toContain("userCodeHash");
		expect(serialized).not.toContain("clientNotificationToken");
	});

	it("requires Agent Auth read permission", async () => {
		expect(
			(await handleAdminGetAgentAuth(makeDependencies(null).dependencies))
				.status,
		).toBe(401);
		expect(
			(await handleAdminGetAgentAuth(makeDependencies("user").dependencies))
				.status,
		).toBe(403);
	});

	it("requires manage permission, freshness, origin, and a real session", async () => {
		const input = {
			resource: "agent" as AdminAgentAuthResource,
			id: "agent-1",
		};
		expect(
			(
				await handleAdminAgentAuthMutation(
					makeDependencies("security_admin").dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					input,
				)
			).status,
		).toBe(403);
		expect(
			(
				await handleAdminAgentAuthMutation(
					makeDependencies("super_admin", {
						createdAt: new Date(0),
					}).dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					input,
				)
			).status,
		).toBe(403);
		expect(
			(
				await handleAdminAgentAuthMutation(
					makeDependencies("super_admin", {
						impersonatedBy: "root-admin",
					}).dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					input,
				)
			).status,
		).toBe(403);
		expect(
			(
				await handleAdminAgentAuthMutation(
					makeDependencies().dependencies,
					"https://evil.example",
					ADMIN_ORIGIN,
					input,
				)
			).status,
		).toBe(403);
		expect(
			(
				await handleAdminAgentAuthMutation(
					makeDependencies("super_admin", { allowed: false }).dependencies,
					ADMIN_ORIGIN,
					ADMIN_ORIGIN,
					input,
				)
			).status,
		).toBe(429);
	});

	it.each([
		["agent", "agent-1", "revoke"],
		["host", "host-1", "revoke"],
		["grant", "grant-1", "revoke"],
		["approval", "approval-1", "deny"],
	] as const)("mutates and audits a governed %s resource", async (resource, id, action) => {
		const fixture = makeDependencies();
		const result = await handleAdminAgentAuthMutation(
			fixture.dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			{ resource, id },
		);

		expect(result.status).toBe(200);
		expect(fixture.connect).toHaveBeenCalledOnce();
		expect(fixture.dependencies.writeAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: `integration.agent-auth.${resource}.${action}`,
				phase: "outcome",
				result: "success",
				actorId: "admin-1",
				metadata: { resource, targetId: id },
			}),
		);
	});

	it.each([
		["agent", "agent-1", "'active', 'pending', 'claimed'"],
		["host", "host-1", "'active', 'pending', 'pending_enrollment'"],
		["grant", "grant-1", "'active', 'pending'"],
	] as const)("revokes only an actionable %s", async (resource, id, statuses) => {
		const fixture = makeDependencies();
		await handleAdminAgentAuthMutation(
			fixture.dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			{ resource, id },
		);

		const mutationQuery = fixture.clientQuery.mock.calls
			.map(([text]) => text)
			.find((text) => text.includes("RETURNING"));
		expect(mutationQuery).toContain(`"status" IN (${statuses})`);
	});

	it("rejects malformed resource identifiers before touching the database", async () => {
		const fixture = makeDependencies();
		const result = await handleAdminAgentAuthMutation(
			fixture.dependencies,
			ADMIN_ORIGIN,
			ADMIN_ORIGIN,
			{ resource: "agent", id: "../../agent-1" },
		);
		expect(result.status).toBe(400);
		expect(fixture.connect).not.toHaveBeenCalled();
	});
});
