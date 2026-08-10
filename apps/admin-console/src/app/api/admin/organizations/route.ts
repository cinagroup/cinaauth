import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * Generic organization proxy. Forwards GET (list) / POST (create) to cinaauth's
 * /organization endpoints. Create requires super_admin (checked below).
 *
 * Upstream failures remain failures so the console cannot confuse an outage
 * with a legitimately empty organization list.
 */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	const qs = new URL(request.url).searchParams.toString();
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/organization/list?${qs}`, { cookie });
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}

export async function POST(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_BODY", message: "Invalid JSON" } },
			{ status: 400 },
		);
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/create", {
		method: "POST",
		body,
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
