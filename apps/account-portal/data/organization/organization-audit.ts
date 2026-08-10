import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const ORGANIZATION_AUDIT_EXPORT_LIMIT = 10_000;
const ORGANIZATION_AUDIT_EXPORT_PAGE_SIZE = 100;

export type OrganizationAuditResult = "success" | "failure";

export type OrganizationAuditRecord = {
	id: string;
	timestamp: string | Date;
	category: string;
	action: string;
	result: string;
	actorId: string | null;
	actorRole: string | null;
	actorSite: string | null;
	targetType: string | null;
	targetId: string | null;
	metadata: string | null;
};

export type OrganizationAuditPage = {
	rows: OrganizationAuditRecord[];
	total: number;
	limit: number;
	offset: number;
};

export type OrganizationAuditFilters = {
	start?: string;
	end?: string;
	action?: string;
	result?: OrganizationAuditResult;
};

export type OrganizationAuditPageParams = OrganizationAuditFilters & {
	organizationId: string;
	limit: number;
	offset: number;
};

const getErrorMessage = (error: unknown) => {
	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string" &&
		error.message
	) {
		return error.message;
	}
	return "Unable to load organization audit events";
};

const optionalString = (value: string | undefined) => {
	const normalized = value?.trim();
	return normalized || undefined;
};

export async function listOrganizationAuditPage(
	params: OrganizationAuditPageParams,
): Promise<OrganizationAuditPage> {
	const start = optionalString(params.start);
	const end = optionalString(params.end);
	const action = optionalString(params.action);
	const { data, error } = await authClient.$fetch<OrganizationAuditPage>(
		"/audit/organization",
		{
			method: "GET",
			query: {
				organizationId: params.organizationId,
				limit: params.limit,
				offset: params.offset,
				...(start ? { start } : {}),
				...(end ? { end } : {}),
				...(action ? { action } : {}),
				...(params.result ? { result: params.result } : {}),
			},
		},
	);
	if (error) throw new Error(getErrorMessage(error));
	if (!data) throw new Error("Organization audit response was empty");
	return data;
}

export async function loadOrganizationAuditExport(
	params: OrganizationAuditFilters & { organizationId: string },
): Promise<OrganizationAuditRecord[]> {
	const records: OrganizationAuditRecord[] = [];
	const ids = new Set<string>();
	let declaredTotal: number | null = null;

	while (declaredTotal === null || records.length < declaredTotal) {
		const page = await listOrganizationAuditPage({
			...params,
			limit: ORGANIZATION_AUDIT_EXPORT_PAGE_SIZE,
			offset: records.length,
		});
		if (declaredTotal === null) {
			declaredTotal = page.total;
			if (declaredTotal > ORGANIZATION_AUDIT_EXPORT_LIMIT) {
				throw new Error(
					`Audit export contains more than ${ORGANIZATION_AUDIT_EXPORT_LIMIT.toLocaleString("en-US")} events. Narrow the filters and try again.`,
				);
			}
		} else if (page.total !== declaredTotal) {
			throw new Error("Audit events changed during export. Please try again.");
		}

		if (page.rows.length === 0 && records.length < declaredTotal) {
			throw new Error("Audit events changed during export. Please try again.");
		}
		for (const record of page.rows) {
			if (ids.has(record.id)) {
				throw new Error(
					"Audit events changed during export. Please try again.",
				);
			}
			ids.add(record.id);
			records.push(record);
		}
		if (records.length > declaredTotal) {
			throw new Error("Audit events changed during export. Please try again.");
		}
	}

	return records;
}

export const useOrganizationAuditPageQuery = (
	params: OrganizationAuditPageParams,
	initialData?: OrganizationAuditPage,
) =>
	useQuery({
		queryKey: [
			"organization",
			params.organizationId,
			"audit",
			params.limit,
			params.offset,
			params.start ?? null,
			params.end ?? null,
			params.action ?? null,
			params.result ?? null,
		],
		queryFn: () => listOrganizationAuditPage(params),
		initialData,
	});
