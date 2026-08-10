import { describe, expect, it } from "vitest";
import {
	createOrganizationAuditCSV,
	createOrganizationAuditExportFilename,
	createOrganizationAuditJSON,
	getOrganizationAuditDateRange,
} from "./organization-audit-export";

const record = {
	id: "audit-1",
	timestamp: "2026-08-10T09:10:11.000Z",
	category: "organization",
	action: '=HYPERLINK("https://example.invalid")',
	result: "success",
	actorId: "user-1",
	actorRole: "owner",
	actorSite: "accounts.cinaseek.ai",
	targetType: "organization",
	targetId: "organization-1",
	metadata: '{"source":"console"}',
};

describe("organization audit export", () => {
	it("serializes a versioned JSON envelope with the exact tenant and filters", () => {
		const output = JSON.parse(
			createOrganizationAuditJSON({
				organizationId: "organization-1",
				exportedAt: "2026-08-10T10:00:00.000Z",
				filters: { result: "success", action: "org.member" },
				records: [record],
			}),
		);

		expect(output).toMatchObject({
			format: "cinaauth.organization-audit",
			version: 1,
			organizationId: "organization-1",
			exportedAt: "2026-08-10T10:00:00.000Z",
			filters: { result: "success", action: "org.member" },
			total: 1,
		});
		expect(output.events[0]).toMatchObject({ id: "audit-1" });
	});

	it("escapes spreadsheet formulas and quotes CSV cells", () => {
		const csv = createOrganizationAuditCSV([record]);

		expect(csv).toContain('"\'=HYPERLINK(""https://example.invalid"")"');
		expect(csv.startsWith("id,timestamp,category,action,result")).toBe(true);
	});

	it("builds bounded UTC date filters", () => {
		expect(getOrganizationAuditDateRange("2026-08-01", "2026-08-10")).toEqual({
			start: "2026-08-01T00:00:00.000Z",
			end: "2026-08-10T23:59:59.999Z",
		});
		expect(() =>
			getOrganizationAuditDateRange("2026-08-11", "2026-08-10"),
		).toThrow("Start date");
	});

	it("sanitizes organization names in deterministic export filenames", () => {
		expect(
			createOrganizationAuditExportFilename(
				"Cina Group / Production",
				"json",
				"2026-08-10T10:00:00.000Z",
			),
		).toBe("cinaauth-cina-group-production-audit-2026-08-10.json");
	});
});
