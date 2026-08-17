import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const noStoreHeaders = { "Cache-Control": "no-store" };

/** PUT /api/admin/sign-in-settings - set how many federated options the sign-in page shows. */
export async function PUT(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(
			session,
			"integration.social-provider.manage",
		);
	} catch (error) {
		return error as Response;
	}
	if (session.impersonatedBy) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "IMPERSONATED_SESSION_FORBIDDEN",
					message: "Configuration changes are unavailable while impersonating",
					status: 403,
				},
			},
			{ status: 403, headers: noStoreHeaders },
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "BAD_BODY", message: "Invalid JSON" },
			},
			{ status: 400, headers: noStoreHeaders },
		);
	}
	if (
		typeof body !== "object" ||
		body === null ||
		!Number.isSafeInteger(
			(body as { socialProviderLimit?: unknown }).socialProviderLimit,
		) ||
		(body as { socialProviderLimit: number }).socialProviderLimit < 0 ||
		(body as { socialProviderLimit: number }).socialProviderLimit > 20 ||
		typeof (body as { emailOtpLoginEnabled?: unknown }).emailOtpLoginEnabled !==
			"boolean"
	) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "BAD_BODY",
					message:
						"socialProviderLimit must be an integer between 0 and 20 and emailOtpLoginEnabled must be a boolean",
				},
			},
			{ status: 400, headers: noStoreHeaders },
		);
	}

	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const response = await cinaauthFetch("/admin/sign-in-settings", {
		method: "PUT",
		body,
		cookie,
	});
	return NextResponse.json(response, {
		status: response.ok ? 200 : adminUpstreamResponseStatus(response),
		headers: noStoreHeaders,
	});
}
