import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * POST /api/admin/api-keys/[id]/edit — update an API key's name and/or expiry.
 * Forwards to cinaauth's /api-key/update. super_admin only.
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

	// Whitelist fields: only name and expiresAt are editable.
	const update: Record<string, unknown> = { keyId: id };
	if (typeof body.name === "string") update.name = body.name;
	if (body.expiresAt !== undefined) {
		update.expiresAt = body.expiresAt; // null = no expiry, ISO string = expiry
	}

	if (Object.keys(update).length <= 1) {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_REQUEST", message: "No fields to update" } },
			{ status: 400 },
		);
	}

	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/api-key/update", {
		method: "POST",
		body: update,
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
