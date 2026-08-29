const DAY_MS = 86_400_000;

export type AuditServerFilters = {
	category?: string;
	result?: "success" | "failure";
	start?: string;
};

/** Resolve UI filter values once so the list and export use identical bounds. */
export function resolveAuditFilters(
	filters: { category: string; result: string; dateRange: string },
	now = new Date(),
): AuditServerFilters {
	const resolved: AuditServerFilters = {};
	if (filters.category !== "all") resolved.category = filters.category;
	if (filters.result === "success" || filters.result === "failure") {
		resolved.result = filters.result;
	}
	if (filters.dateRange !== "all") {
		const days = Number(filters.dateRange);
		if (Number.isFinite(days) && days > 0) {
			resolved.start = new Date(now.getTime() - days * DAY_MS).toISOString();
		}
	}
	return resolved;
}

const auditSearchParams = (filters: AuditServerFilters) =>
	new URLSearchParams({
		...(filters.category ? { category: filters.category } : {}),
		...(filters.result ? { result: filters.result } : {}),
		...(filters.start ? { start: filters.start } : {}),
	});

/** Build a paginated audit-list request. */
export function buildAuditListPath(
	filters: AuditServerFilters,
	offset: number,
	limit: number,
): string {
	const params = auditSearchParams(filters);
	params.set("limit", String(limit));
	params.set("offset", String(offset));
	return `/api/admin/audit?${params.toString()}`;
}

/** Build an audit export request with the exact visible server filters. */
export function buildAuditExportPath(filters: AuditServerFilters): string {
	const params = auditSearchParams(filters);
	params.set("kind", "audit");
	return `/api/admin/export?${params.toString()}`;
}
