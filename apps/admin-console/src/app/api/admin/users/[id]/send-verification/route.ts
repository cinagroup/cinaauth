import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const VERIFICATION_TYPES = ["email-otp", "phone-number"] as const;
type VerificationType = (typeof VERIFICATION_TYPES)[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isVerificationType = (value: unknown): value is VerificationType =>
	VERIFICATION_TYPES.some((candidate) => candidate === value);

const badRequest = (code: string, message: string) =>
	NextResponse.json(
		{ ok: false, error: { code, message, status: 400 } },
		{ status: 400 },
	);

/**
 * POST /api/admin/users/[id]/send-verification — delegate a verification
 * challenge to CinaAuth's authoritative Admin-only delivery endpoint.
 *
 * Body: { type: "email-otp" | "phone-number" }
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await requireAdmin(request).catch((e: Response) => e);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "identity.user.send-verification");
	} catch (e) {
		return e as Response;
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return badRequest("INVALID_JSON", "Request body must be valid JSON");
	}
	if (!isRecord(body) || !isVerificationType(body.type)) {
		return badRequest(
			"INVALID_VERIFICATION_TYPE",
			"Verification type must be email-otp or phone-number",
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (e) {
		return e as Response;
	}

	const res = await cinaauthFetch<{ sent: boolean }>(
		"/admin/send-verification",
		{
			method: "POST",
			body: { userId: id, type: body.type },
			cookie: request.headers.get("cookie") ?? "",
		},
	);
	if (!res.ok) {
		const upstreamStatus = res.error?.status;
		const status =
			upstreamStatus === 400 ||
			upstreamStatus === 401 ||
			upstreamStatus === 403 ||
			upstreamStatus === 404
				? upstreamStatus
				: 502;
		return NextResponse.json({ ok: false, error: res.error }, { status });
	}
	return NextResponse.json({ ok: true, data: { sent: true } });
}
