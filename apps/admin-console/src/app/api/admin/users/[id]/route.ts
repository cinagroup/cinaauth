import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

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
	try {
		requireAdminControlPermission(session, "identity.user.read");
	} catch (e) {
		return e as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch<Record<string, unknown>>(
		`/admin/get-user?id=${encodeURIComponent(id)}`,
		{ cookie },
	);
	if (!res.ok) {
		const status = adminUpstreamResponseStatus(res, { allowNotFound: true });
		return NextResponse.json({ ok: false, error: res.error }, { status });
	}
	if (!res.data || typeof res.data !== "object" || Array.isArray(res.data)) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "CINAUTH_INVALID_USER_RESPONSE",
					message: "CinaSeek Identity returned an invalid user response",
					status: 502,
				},
			},
			{ status: 502 },
		);
	}

	// CinaAuth's get-user endpoint returns the user record directly. Keep the
	// console BFF contract explicit so the detail page can distinguish a valid
	// user from a successful response with missing data.
	return NextResponse.json(
		{ ok: true, data: { user: res.data } },
		{ status: 200 },
	);
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
		requireAdminControlPermission(session, "identity.user.delete");
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
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}
	const cookie = request.headers.get("cookie") ?? "";
	const res = await cinaauthFetch("/admin/remove-user", {
		method: "POST",
		body: { userId: id },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}

/**
 * PATCH /api/admin/users/[id] — update a user profile.
 * Body fields (all optional, whitelisted):
 *   - name / email / emailVerified : identity.user.update
 *   - role                         : identity.user.set-role
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

	let body: {
		name?: string;
		email?: string;
		role?: string;
		emailVerified?: boolean;
	};
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_BODY", message: "Invalid JSON" } },
			{ status: 400 },
		);
	}

	// Build the whitelisted data payload and authorize every requested field.
	const data: Record<string, unknown> = {};
	const cookie = request.headers.get("cookie") ?? "";

	if (typeof body.name === "string") {
		try {
			requireAdminControlPermission(session, "identity.user.update");
		} catch (e) {
			return e as Response;
		}
		data.name = body.name;
	}
	// A manual verification override is still an identity update.
	if (body.emailVerified !== undefined) {
		try {
			requireAdminControlPermission(session, "identity.user.update");
		} catch (e) {
			return e as Response;
		}
		data.emailVerified = body.emailVerified;
	}
	if (body.email !== undefined) {
		try {
			requireAdminControlPermission(session, "identity.user.update");
		} catch (e) {
			return e as Response;
		}
	}
	if (typeof body.email === "string") data.email = body.email;
	if (typeof body.role === "string") {
		try {
			requireAdminControlPermission(session, "identity.user.set-role");
		} catch (e) {
			return e as Response;
		}
		// Lockout protection: changing your own role can strip console access
		// with no one left to restore it.
		if (id === session.userId) {
			return NextResponse.json(
				{
					ok: false,
					error: {
						code: "SELF_TARGET",
						message: "Cannot change your own role",
					},
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
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}

	const res = await cinaauthFetch("/admin/update-user", {
		method: "POST",
		body: { userId: id, data },
		cookie,
	});
	return NextResponse.json(res, { status: adminUpstreamResponseStatus(res) });
}
