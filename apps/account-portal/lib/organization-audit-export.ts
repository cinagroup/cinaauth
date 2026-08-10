import type {
	OrganizationAuditFilters,
	OrganizationAuditRecord,
} from "@/data/organization/organization-audit";

export type OrganizationAuditExportFormat = "json" | "csv";

type OrganizationAuditJSONParams = {
	organizationId: string;
	exportedAt: string;
	filters: OrganizationAuditFilters;
	records: OrganizationAuditRecord[];
};

const parseUTCDate = (value: string, boundary: "start" | "end") => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error(
			`${boundary === "start" ? "Start" : "End"} date is invalid.`,
		);
	}
	const timestamp = `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}Z`;
	const parsed = new Date(timestamp);
	if (
		!Number.isFinite(parsed.getTime()) ||
		!parsed.toISOString().startsWith(value)
	) {
		throw new Error(
			`${boundary === "start" ? "Start" : "End"} date is invalid.`,
		);
	}
	return parsed.toISOString();
};

export const getOrganizationAuditDateRange = (
	startDate: string,
	endDate: string,
): Pick<OrganizationAuditFilters, "start" | "end"> => {
	const start = startDate ? parseUTCDate(startDate, "start") : undefined;
	const end = endDate ? parseUTCDate(endDate, "end") : undefined;
	if (start && end && start > end) {
		throw new Error("Start date must be on or before the end date.");
	}
	return { ...(start ? { start } : {}), ...(end ? { end } : {}) };
};

export const createOrganizationAuditJSON = ({
	organizationId,
	exportedAt,
	filters,
	records,
}: OrganizationAuditJSONParams) =>
	JSON.stringify(
		{
			format: "cinaauth.organization-audit",
			version: 1,
			organizationId,
			exportedAt,
			filters,
			total: records.length,
			events: records,
		},
		null,
		2,
	);

const CSV_COLUMNS = [
	"id",
	"timestamp",
	"category",
	"action",
	"result",
	"actorId",
	"actorRole",
	"actorSite",
	"targetType",
	"targetId",
	"metadata",
] as const satisfies readonly (keyof OrganizationAuditRecord)[];

const escapeCSVCell = (value: string | Date | null) => {
	let normalized =
		value instanceof Date ? value.toISOString() : String(value ?? "");
	if (/^[\t\r ]*[=+\-@]/.test(normalized)) normalized = `'${normalized}`;
	return `"${normalized.replaceAll('"', '""')}"`;
};

export const createOrganizationAuditCSV = (
	records: OrganizationAuditRecord[],
) =>
	[
		CSV_COLUMNS.join(","),
		...records.map((record) =>
			CSV_COLUMNS.map((column) => escapeCSVCell(record[column])).join(","),
		),
	].join("\r\n");

export const createOrganizationAuditExportFilename = (
	organizationName: string,
	format: OrganizationAuditExportFormat,
	exportedAt: string,
) => {
	const organizationSlug =
		organizationName
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 64) || "organization";
	const date = new Date(exportedAt).toISOString().slice(0, 10);
	return `cinaauth-${organizationSlug}-audit-${date}.${format}`;
};
