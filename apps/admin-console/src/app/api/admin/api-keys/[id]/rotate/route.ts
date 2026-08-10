import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * POST /api/admin/api-keys/[id]/rotate — rotate an API key.
 * Deletes the old key and creates a new one. The new plaintext key is
 * returned (shown once). Requires super_admin.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	// Consume request body to prevent request smuggling.
	// No validation needed: this is an action-only route (no body expected).
	await request.json().catch(() => ({}));
	const { id } = await params;
	const cookie = request.headers.get("cookie") ?? "";

	// Create the replacement FIRST — if creation fails we must not have
	// destroyed the old key, or the caller is left with no working key at all.
	const newKey = await cinaauthFetch<{ key: string }>(`/api-key/create`, {
		method: "POST",
		body: { name: `rotated-${Date.now()}` },
		cookie,
	});
	if (!newKey.ok) {
		return NextResponse.json(newKey, { status: 502 });
	}

	// Then retire the old key (ignore errors if already gone — the new key is
	// live either way and its plaintext must reach the caller).
	await cinaauthFetch(`/api-key/delete`, {
		method: "POST",
		body: { keyId: id },
		cookie,
	});

	return NextResponse.json(newKey, { status: 200 });
}
