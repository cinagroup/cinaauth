import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { parseAdminApiKeyUpdateBody } from "@/lib/cinaauth/api-key-admin";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/**
 * POST /api/admin/api-keys/[id]/edit — update an API key's name and/or expiry.
 * Forwards to cinaauth's /api-key/update. super_admin only.
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
	const body: unknown = await request.json().catch(() => null);
	const parsed = parseAdminApiKeyUpdateBody(id, body);
	if (!parsed.ok) {
		return NextResponse.json(
			{ ok: false, error: parsed.error },
			{ status: 400 },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/api-key/update", {
		method: "POST",
		body: parsed.value,
		cookie,
	});
	return NextResponse.json(res, {
		status: adminUpstreamResponseStatus(res),
		headers: { "Cache-Control": "no-store" },
	});
}
