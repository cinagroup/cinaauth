import { type NextRequest, NextResponse } from "next/server";
import {
	requireAdmin,
	requireRole,
	ADMIN_AND_SECURITY,
} from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";

/**
 * POST /api/admin/users/[id]/send-verification — trigger an email
 * verification OTP for a user (emailOTP plugin). admin+security only.
 *
 * Body: { type: "email-otp" | "magic-link" }
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireRole(session, ADMIN_AND_SECURITY);
	} catch (e) {
		return e as Response;
	}

	const body = await request.json().catch(() => ({}));
	const { type } = body as { type?: string };
	const cookie = request.headers.get("cookie") ?? "";

	// First get the user's email
	const userRes = await cinaauthFetch<{
		user?: { email?: string; phoneNumber?: string };
	}>(
		`/admin/get-user?id=${encodeURIComponent(id)}`,
		{ cookie },
	);
	if (!userRes.ok) {
		const status = userRes.error?.status === 404 ? 404 : 502;
		return NextResponse.json(
			{ ok: false, error: userRes.error },
			{ status },
		);
	}
	const user = userRes.data?.user;
	if (!user?.email) {
		return NextResponse.json(
			{ ok: false, error: { code: "USER_NOT_FOUND" } },
			{ status: 404 },
		);
	}
	const email = user.email;

	let endpoint: string;
	let reqBody: Record<string, unknown>;
	if (type === "magic-link") {
		endpoint = "/sign-in/magic-link";
		reqBody = { email };
	} else if (type === "phone-number") {
		// phoneNumber plugin requires a phone number; the user record may have one
		const phoneNumber = user.phoneNumber;
		if (!phoneNumber) {
			return NextResponse.json(
				{ ok: false, error: { code: "NO_PHONE", message: "User has no phone number" } },
				{ status: 400 },
			);
		}
		endpoint = "/phone-number/send-otp";
		reqBody = { phoneNumber };
	} else {
		endpoint = "/email-otp/send-verification-otp";
		reqBody = { email };
	}

	const res = await cinaauthFetch(endpoint, {
		method: "POST",
		body: reqBody,
		cookie,
	});
	if (!res.ok) {
		return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
	}
	return NextResponse.json({ ok: true, data: { sent: true } });
}
