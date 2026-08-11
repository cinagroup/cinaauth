import { type NextRequest, NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * POST /api/admin/users/batch — batch operation on multiple users.
 *
 * Body: { action: "ban" | "delete", userIds: string[] }
 *
 * Iterates over userIds and calls the corresponding cinaauth endpoint for
 * each. Not atomic — partial failures are reported. Authorization follows
 * the requested action and every accepted batch requires recent auth.
 */
export async function POST(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}

	let body: { action?: string; userIds?: unknown };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: "Invalid JSON body" },
			{ status: 400 },
		);
	}

	if (body.action !== "ban" && body.action !== "delete") {
		return NextResponse.json(
			{ ok: false, error: `Unknown action: ${String(body.action)}` },
			{ status: 400 },
		);
	}
	try {
		requireAdminControlPermission(
			session,
			body.action === "ban" ? "identity.user.ban" : "identity.user.delete",
		);
	} catch (e) {
		return e as Response;
	}
	const userIds = Array.isArray(body.userIds)
		? body.userIds.filter((u): u is string => typeof u === "string" && u !== "")
		: [];
	if (!userIds.length) {
		return NextResponse.json({ ok: false, error: "No userIds provided" }, { status: 400 });
	}
	if (userIds.length > 100) {
		return NextResponse.json(
			{ ok: false, error: "Too many userIds (max 100 per batch)" },
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const results: { userId: string; ok: boolean; error?: string }[] = [];

	for (const userId of userIds) {
		// Never ban/delete the acting admin — a self-inflicted lockout inside
		// a batch would also abort recovery for the remaining entries.
		if (userId === session.userId) {
			results.push({ userId, ok: false, error: "Cannot target own account" });
			continue;
		}
		try {
			if (body.action === "ban") {
				const res = await cinaauthFetch(`/admin/ban-user`, {
					method: "POST",
					body: { userId, banReason: "Batch ban", notify: false },
					cookie,
				});
				const status = adminUpstreamResponseStatus(res);
				if (!res.ok && (status === 401 || status === 403)) {
					return NextResponse.json(res, { status });
				}
				results.push({ userId, ok: res.ok });
			} else if (body.action === "delete") {
				const res = await cinaauthFetch(`/admin/remove-user`, {
					method: "POST",
					body: { userId },
					cookie,
				});
				const status = adminUpstreamResponseStatus(res);
				if (!res.ok && (status === 401 || status === 403)) {
					return NextResponse.json(res, { status });
				}
				results.push({ userId, ok: res.ok });
			}
		} catch (err) {
			results.push({
				userId,
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	const failed = results.filter((r) => !r.ok);
	return NextResponse.json({
		ok: failed.length === 0,
		data: {
			total: results.length,
			succeeded: results.length - failed.length,
			failed: failed.length,
			results,
		},
	});
}
