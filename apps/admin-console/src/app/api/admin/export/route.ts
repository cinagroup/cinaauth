import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

type ExportKind = "audit" | "users";

const esc = (v: unknown): string => {
	const raw = v == null ? "" : String(v);
	// Spreadsheet applications can execute user-controlled fields beginning
	// with formula sigils. A leading apostrophe keeps the value as text.
	const s = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Mask an IP address for privacy: keeps the first two octets (IPv4) or
 * first two groups (IPv6), replaces the rest with "x".
 *   "1.2.3.4"     → "1.2.x.x"
 *   "::1"          → "::x"
 *   "2001:db8::1" → "2001:db8::x"
 * Returns the original value if it doesn't look like an IP.
 */
function maskIp(ip: string | null | undefined): string {
	if (!ip) return "";
	// IPv4: a.b.c.d → a.b.x.x
	const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
	if (v4) return `${v4[1]}.${v4[2]}.x.x`;
	// IPv6: keep first two groups
	const v6 = ip.match(/^([0-9a-fA-F:]+?:[0-9a-fA-F]+?):/);
	if (v6 && ip.includes(":")) return `${v6[1]}::x`;
	return ip; // not an IP, return as-is
}

const parseCsvRows = (csv: string): string[][] => {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;

	for (let index = 0; index < csv.length; index += 1) {
		const character = csv[index];
		if (quoted) {
			if (character === '"' && csv[index + 1] === '"') {
				field += '"';
				index += 1;
			} else if (character === '"') {
				quoted = false;
			} else {
				field += character;
			}
			continue;
		}

		if (character === '"' && field.length === 0) {
			quoted = true;
		} else if (character === ",") {
			row.push(field);
			field = "";
		} else if (character === "\n" || character === "\r") {
			if (character === "\r" && csv[index + 1] === "\n") index += 1;
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else {
			field += character;
		}
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
};

/** Mask IPs without losing RFC 4180 quoting in the Auth Worker CSV. */
function maskIpsInCsv(csv: string): string {
	const rows = parseCsvRows(csv);
	if (rows.length < 2) return csv;
	const ipCol = rows[0].findIndex((field) =>
		field.trim().toLowerCase().includes("ip"),
	);
	if (ipCol < 0) return csv;

	for (const row of rows.slice(1)) {
		if (row[ipCol]) row[ipCol] = maskIp(row[ipCol]);
	}
	return rows.map((row) => row.map(esc).join(",")).join("\n");
}

const createAuditedCsvResponse = async ({
	csv,
	kind,
	cookie,
}: {
	csv: string;
	kind: ExportKind;
	cookie: string;
}) => {
	// `/audit/export` is captured by the Auth plugin's after hook. The users
	// export exists only in this BFF, so it needs an explicit audit event.
	if (kind === "users") {
		const audit = await cinaauthFetch("/audit/log", {
			method: "POST",
			cookie,
			body: {
				category: "admin",
				action: "admin.export_csv",
				result: "success",
				actorSite: "admin",
				targetType: "user",
				metadata: { kind },
			},
		});
		if (!audit.ok) {
			const status = adminUpstreamResponseStatus(audit);
			if (status === 401 || status === 403) {
				return Response.json(audit, {
					status,
					headers: { "cache-control": "no-store" },
				});
			}
			return new Response("audit unavailable", {
				status: 502,
				headers: { "cache-control": "no-store" },
			});
		}
	}

	return new Response(csv, {
		headers: {
			"cache-control": "no-store",
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="${kind}-${Date.now()}.csv"`,
			"x-content-type-options": "nosniff",
		},
	});
};

/**
 * GET /api/admin/export?kind=users|audit
 *
 * Stream the filtered data as CSV. For `users` we map the JSON list-users
 * response to CSV; for `audit` cinaauth already returns CSV text from
 * /audit/export (we forward it).
 */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (
		!session ||
		!hasAdminControlPermission(session.role, "security.audit.export")
	) {
		return new Response("forbidden", { status: 403 });
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}
	const { searchParams } = new URL(request.url);
	const kind = searchParams.get("kind") ?? "users";
	const cookie = request.headers.get("cookie") ?? "";

	if (kind === "audit") {
		const res = await cinaauthFetch<string>(`/audit/export?${searchParams}`, {
			cookie,
		});
		// Fail loudly: a silent empty CSV reads as "no audit rows", which is a
		// dangerous conclusion to hand an auditor when the upstream call failed.
		if (!res.ok || typeof res.data !== "string") {
			const status = adminUpstreamResponseStatus(res);
			if (status === 401 || status === 403) {
				return Response.json(res, {
					status,
					headers: { "cache-control": "no-store" },
				});
			}
			return new Response("upstream error", { status: 502 });
		}
		// Mask IP addresses in the exported CSV for privacy.
		const csv = maskIpsInCsv(res.data);
		return createAuditedCsvResponse({ csv, kind: "audit", cookie });
	}

	// users
	const res = await cinaauthFetch<{ users: Record<string, unknown>[] }>(
		`/admin/list-users?${searchParams}&limit=10000`,
		{ cookie },
	);
	if (!res.ok) {
		const status = adminUpstreamResponseStatus(res);
		if (status === 401 || status === 403) {
			return Response.json(res, {
				status,
				headers: { "cache-control": "no-store" },
			});
		}
		return new Response("upstream error", { status: 502 });
	}
	if (!res.data) return new Response("upstream error", { status: 502 });
	const cols = ["id", "email", "name", "role", "banned", "createdAt"];
	const lines = [
		cols.join(","),
		...res.data.users.map((u) => cols.map((c) => esc(u[c])).join(",")),
	];
	return createAuditedCsvResponse({
		csv: lines.join("\n"),
		kind: "users",
		cookie,
	});
}
