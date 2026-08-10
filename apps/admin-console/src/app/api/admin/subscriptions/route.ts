import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** GET /api/admin/subscriptions — list subscriptions. */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/subscription/list", { cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}

/** POST /api/admin/subscriptions — upgrade, cancel, or get billing portal URL. */
export async function POST(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const body = await request.json().catch(() => ({}));
	const { action } = body as { action?: string };
	const cookie = request.headers.get("cookie") ?? "";

	// Explicit allow-list. Never fall through to the destructive "cancel" for an
	// unknown or missing action — a malformed request must not silently cancel
	// a subscription.
	const endpoints: Record<string, string> = {
		cancel: "/subscription/cancel",
		upgrade: "/subscription/upgrade",
		portal: "/subscription/billing-portal",
	};
	const endpoint = action ? endpoints[action] : undefined;
	if (!endpoint) {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_REQUEST", message: `Unknown action: ${String(action)}` } },
			{ status: 400 },
		);
	}

	const res = await cinaauthFetch(endpoint, { method: "POST", body, cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
