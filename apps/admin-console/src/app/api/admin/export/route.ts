import { type NextRequest } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

const esc = (v: unknown): string => {
	const s = v == null ? "" : String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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

/** Mask IPs in CSV text (audit export from cinaauth). */
function maskIpsInCsv(csv: string): string {
	// Split into lines, find the IP column index from header, mask values.
	const lines = csv.split("\n");
	if (lines.length < 2) return csv;
	const header = lines[0].split(",");
	const ipCol = header.findIndex((h) => h.trim().toLowerCase().includes("ip"));
	if (ipCol < 0) return csv; // no IP column
	return lines
		.map((line, lineIdx) => {
			if (lineIdx === 0) return line; // header
			const cols = line.split(",");
			if (cols[ipCol]) cols[ipCol] = maskIp(cols[ipCol]);
			return cols.join(",");
		})
		.join("\n");
}

/**
 * GET /api/admin/export?kind=users|audit
 *
 * Stream the filtered data as CSV. For `users` we map the JSON list-users
 * response to CSV; for `audit` cinaauth already returns CSV text from
 * /audit/export (we forward it).
 */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return new Response("forbidden", { status: 403 });
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
			return new Response("upstream error", { status: 502 });
		}
		// Mask IP addresses in the exported CSV for privacy.
		const csv = maskIpsInCsv(res.data);
		return new Response(csv, {
			headers: {
				"content-type": "text/csv; charset=utf-8",
				"content-disposition": `attachment; filename="audit-${Date.now()}.csv"`,
			},
		});
	}

	// users
	const res = await cinaauthFetch<{ users: Record<string, unknown>[] }>(
		`/admin/list-users?${searchParams}&limit=10000`,
		{ cookie },
	);
	if (!res.ok || !res.data) return new Response("upstream error", { status: 502 });
	const cols = ["id", "email", "name", "role", "banned", "createdAt"];
	const lines = [
		cols.join(","),
		...res.data.users.map((u) => cols.map((c) => esc(u[c])).join(",")),
	];
	return new Response(lines.join("\n"), {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="users-${Date.now()}.csv"`,
		},
	});
}
