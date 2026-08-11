import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireAdminControlPermission,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** GET /api/admin/organizations/[id]/teams/[teamId]/members — list team members. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; teamId: string }> }) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "organization.read");
	} catch (error) {
		return error as Response;
	}
	const { teamId } = await params;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/organization/list-team-members`, { method: "POST", body: { teamId }, cookie });
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}

/** POST /api/admin/organizations/[id]/teams/[teamId]/members — add a member. */
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
	const res = await cinaauthFetch("/organization/add-team-member", { method: "POST", body: { ...body, teamId }, cookie });
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
