import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * POST /api/admin/api-keys/[id]/toggle — enable or disable an API key.
 * Forwards to cinaauth's /api-key/update with `enabled` field.
 * Requires super_admin.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "integration.api-key.manage");
	} catch (error) {
		return error as Response;
	}
	const { id } = await params;
	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	// Validate: enabled must be a boolean, reject all other fields.
	if (typeof body.enabled !== "boolean") {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "BAD_REQUEST",
					message: "Field 'enabled' must be a boolean",
				},
			},
			{ status: 400 },
		);
	}
	if (Object.keys(body).some((field) => field !== "enabled")) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "BAD_REQUEST",
					message: "Only 'enabled' may be updated",
				},
			},
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/api-key/update`, {
		method: "POST",
		body: { keyId: id, enabled: body.enabled },
		cookie,
	});
	return NextResponse.json(res, {
		status: adminUpstreamResponseStatus(res),
		headers: { "Cache-Control": "no-store" },
	});
}
