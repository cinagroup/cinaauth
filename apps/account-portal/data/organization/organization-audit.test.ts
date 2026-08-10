import { beforeEach, describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth-client";
import {
	listOrganizationAuditPage,
	loadOrganizationAuditExport,
} from "./organization-audit";

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		$fetch: vi.fn(),
	},
}));

const fetchMock = vi.mocked(authClient.$fetch);

const createRecord = (index: number) => ({
	id: `audit-${index}`,
	timestamp: `2026-08-10T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
	category: "organization",
	action: "org.member_role_update",
	result: "success",
	actorId: `user-${index}`,
	actorRole: "owner",
	actorSite: "accounts.cinaseek.ai",
	targetType: "organization",
	targetId: "organization-1",
	metadata: null,
});

describe("organization audit data contract", () => {
	beforeEach(() => {
		fetchMock.mockReset();
	});

	it("requests an exact tenant-scoped filtered page", async () => {
		fetchMock.mockResolvedValue({
			data: { rows: [createRecord(1)], total: 1, limit: 25, offset: 50 },
			error: null,
		} as never);

		await expect(
			listOrganizationAuditPage({
				organizationId: "organization-1",
				limit: 25,
				offset: 50,
				start: "2026-08-01T00:00:00.000Z",
				end: "2026-08-10T23:59:59.999Z",
				action: "org.member_role_update",
				result: "success",
			}),
		).resolves.toMatchObject({ total: 1, limit: 25, offset: 50 });

		expect(fetchMock).toHaveBeenCalledWith("/audit/organization", {
			method: "GET",
			query: {
				organizationId: "organization-1",
				limit: 25,
				offset: 50,
				start: "2026-08-01T00:00:00.000Z",
				end: "2026-08-10T23:59:59.999Z",
				action: "org.member_role_update",
				result: "success",
			},
		});
	});

	it("omits blank filters from the authoritative request", async () => {
		fetchMock.mockResolvedValue({
			data: { rows: [], total: 0, limit: 20, offset: 0 },
			error: null,
		} as never);

		await listOrganizationAuditPage({
			organizationId: "organization-1",
			limit: 20,
			offset: 0,
			action: "   ",
		});

		expect(fetchMock).toHaveBeenCalledWith("/audit/organization", {
			method: "GET",
			query: {
				organizationId: "organization-1",
				limit: 20,
				offset: 0,
			},
		});
	});

	it("loads every export page without silently truncating", async () => {
		const first = Array.from({ length: 100 }, (_, index) =>
			createRecord(index),
		);
		const second = Array.from({ length: 50 }, (_, index) =>
			createRecord(index + 100),
		);
		fetchMock
			.mockResolvedValueOnce({
				data: { rows: first, total: 150, limit: 100, offset: 0 },
				error: null,
			} as never)
			.mockResolvedValueOnce({
				data: { rows: second, total: 150, limit: 100, offset: 100 },
				error: null,
			} as never);

		const records = await loadOrganizationAuditExport({
			organizationId: "organization-1",
		});

		expect(records).toHaveLength(150);
		expect(fetchMock).toHaveBeenNthCalledWith(2, "/audit/organization", {
			method: "GET",
			query: {
				organizationId: "organization-1",
				limit: 100,
				offset: 100,
			},
		});
	});

	it("fails before a second request when the export exceeds the safe limit", async () => {
		fetchMock.mockResolvedValue({
			data: {
				rows: Array.from({ length: 100 }, (_, index) => createRecord(index)),
				total: 10_001,
				limit: 100,
				offset: 0,
			},
			error: null,
		} as never);

		await expect(
			loadOrganizationAuditExport({ organizationId: "organization-1" }),
		).rejects.toThrow("10,000");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("fails closed when a page disappears before the declared total", async () => {
		fetchMock
			.mockResolvedValueOnce({
				data: {
					rows: Array.from({ length: 100 }, (_, index) => createRecord(index)),
					total: 150,
					limit: 100,
					offset: 0,
				},
				error: null,
			} as never)
			.mockResolvedValueOnce({
				data: { rows: [], total: 150, limit: 100, offset: 100 },
				error: null,
			} as never);

		await expect(
			loadOrganizationAuditExport({ organizationId: "organization-1" }),
		).rejects.toThrow("changed during export");
	});
});
