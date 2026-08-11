import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireAdminControlPermission,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** POST /api/admin/organizations/[id]/teams/[teamId] — update a team. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; teamId: string }> }) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "organization.team.manage");
	} catch (error) {
		return error as Response;
	}
	const { teamId } = await params;
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	// Pin teamId after the spread so the path param always wins.
	const res = await cinaauthFetch("/organization/update-team", { method: "POST", body: { ...body, teamId }, cookie });
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}

/** DELETE /api/admin/organizations/[id]/teams/[teamId] — delete a team. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; teamId: string }> }) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "organization.team.manage");
	} catch (error) {
		return error as Response;
	}
	const { teamId } = await params;
	await request.json().catch(() => ({}));
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/organization/remove-team", { method: "POST", body: { teamId }, cookie });
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
