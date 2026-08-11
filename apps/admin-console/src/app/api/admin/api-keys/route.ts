import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { parseAdminApiKeyCreateBody } from "@/lib/cinaauth/api-key-admin";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const ACTOR_KEY_LIST_QUERY_FIELDS = new Set([
	"configId",
	"limit",
	"offset",
	"sortBy",
	"sortDirection",
]);

/** GET /api/admin/api-keys — list keys. POST — create key (super_admin). */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "integration.api-key.read");
	} catch (error) {
		return error as Response;
	}
	const searchParams = new URL(request.url).searchParams;
	const unsupportedField = [...searchParams.keys()].find(
		(field) => !ACTOR_KEY_LIST_QUERY_FIELDS.has(field),
	);
	if (unsupportedField) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "UNSUPPORTED_API_KEY_QUERY",
					message: `Query '${unsupportedField}' is not available for actor-owned Admin API keys`,
				},
			},
			{ status: 400 },
		);
	}
	const qs = searchParams.toString();
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/api-key/list?${qs}`, { cookie });
	return NextResponse.json(res, {
		status: adminUpstreamResponseStatus(res),
		headers: { "Cache-Control": "no-store" },
	});
}

export async function POST(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "integration.api-key.manage");
	} catch (error) {
		return error as Response;
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
	const parsed = parseAdminApiKeyCreateBody(body);
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
	const res = await cinaauthFetch("/api-key/create", {
		method: "POST",
		body: parsed.value,
		cookie,
	});
	return NextResponse.json(res, {
		status: adminUpstreamResponseStatus(res),
		headers: { "Cache-Control": "no-store" },
	});
}
