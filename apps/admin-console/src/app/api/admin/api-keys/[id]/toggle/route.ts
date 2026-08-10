import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

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
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const { id } = await params;
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	// Validate: enabled must be a boolean, reject all other fields.
	if (typeof body.enabled !== "boolean") {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_REQUEST", message: "Field 'enabled' must be a boolean" } },
			{ status: 400 },
		);
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/api-key/update`, {
		method: "POST",
		body: { keyId: id, enabled: body.enabled },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
