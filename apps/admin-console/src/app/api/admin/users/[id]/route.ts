import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireRole,
	ADMIN_AND_SECURITY,
	SUPER_ADMIN_ONLY,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/** Role values the console may assign (mirrors the role selector UI). */
const VALID_ROLES = ["user", "security_admin", "super_admin"];

/** GET /api/admin/users/[id] — fetch a single user's profile. */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch(`/admin/get-user?id=${encodeURIComponent(id)}`, { cookie });
	if (!res.ok) {
		const status = res.error?.status === 404 ? 404 : 502;
		return NextResponse.json({ ok: false, error: res.error }, { status });
	}
	return NextResponse.json(res, { status: 200 });
}

/** DELETE /api/admin/users/[id] — remove user (super_admin only). */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireRole(session, SUPER_ADMIN_ONLY);
	} catch (e) {
		return e as Response;
	}
	if (id === session.userId) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "SELF_TARGET",
					message: "Cannot delete your own account",
				},
			},
			{ status: 400 },
		);
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/remove-user", {
		method: "POST",
		body: { userId: id },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}

/**
 * PATCH /api/admin/users/[id] — update a user profile.
 * Body fields (all optional, whitelisted):
 *   - name  : any admin+security role
 *   - email : super_admin only (maps to user:set-email)
 *   - role  : super_admin only (maps to user:set-role)
 *
 * Forwards to cinaauth `/admin/update-user` (POST { userId, data }).
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;

	let body: { name?: string; email?: string; role?: string; emailVerified?: boolean };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_BODY", message: "Invalid JSON" } },
			{ status: 400 },
		);
	}

	// Build the whitelisted data payload; escalate role for sensitive fields.
	const data: Record<string, unknown> = {};
	const cookie = request.headers.get("cookie") ?? "";

	if (typeof body.name === "string") {
		// name change: admin + security
		try {
			requireRole(session, ADMIN_AND_SECURITY);
		} catch (e) {
			return e as Response;
		}
		data.name = body.name;
	}
	// emailVerified: super_admin only (manual verification override)
	if (body.emailVerified !== undefined) {
		try {
			requireRole(session, SUPER_ADMIN_ONLY);
		} catch (e) {
			return e as Response;
		}
		data.emailVerified = body.emailVerified;
	}
	// email + role changes require super_admin.
	const wantsSensitive = body.email !== undefined || body.role !== undefined;
	if (wantsSensitive) {
		try {
			requireRole(session, SUPER_ADMIN_ONLY);
		} catch (e) {
			return e as Response;
		}
	}
	if (typeof body.email === "string") data.email = body.email;
	if (typeof body.role === "string") {
		// Lockout protection: changing your own role can strip console access
		// with no one left to restore it.
		if (id === session.userId) {
			return NextResponse.json(
				{
					ok: false,
					error: { code: "SELF_TARGET", message: "Cannot change your own role" },
				},
				{ status: 400 },
			);
		}
		if (!VALID_ROLES.includes(body.role)) {
			return NextResponse.json(
				{
					ok: false,
					error: { code: "BAD_ROLE", message: `Unknown role: ${body.role}` },
				},
				{ status: 400 },
			);
		}
		data.role = body.role;
	}

	if (Object.keys(data).length === 0) {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "NO_FIELDS", message: "No updatable fields supplied" },
			},
			{ status: 400 },
		);
	}

	const res = await cinaauthFetch("/admin/update-user", {
		method: "POST",
		body: { userId: id, data },
		cookie,
	});
	return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
