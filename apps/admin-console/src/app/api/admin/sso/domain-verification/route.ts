import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import type { AdminSsoProvider } from "@/lib/integration-contract";
import { parseDomainVerificationAction } from "@/lib/integration-contract";
import { resolveTenantProvider } from "@/lib/integration-tenant-scope";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const noStoreHeaders = { "Cache-Control": "no-store" };

/** POST /api/admin/sso/domain-verification - request a token or verify DNS. */
export async function POST(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.sso.manage");
	} catch (error) {
		return error as Response;
	}

	let input: unknown;
	try {
		input = await request.json();
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: "BAD_BODY", message: "Invalid JSON" } },
			{ status: 400, headers: noStoreHeaders },
		);
	}
	const parsed = parseDomainVerificationAction(input);
	if (!parsed.success) {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "BAD_BODY", message: parsed.message },
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
	const resolution = await resolveTenantProvider<AdminSsoProvider>(
		`/sso/get-provider?providerId=${encodeURIComponent(parsed.value.providerId)}`,
		parsed.value.organizationId,
		cookie,
	);
	if (!resolution.success) return resolution.response;
	const endpoint =
		parsed.value.action === "verify"
			? "/sso/verify-domain"
			: "/sso/request-domain-verification";
	const response = await cinaauthFetch(endpoint, {
		method: "POST",
		body: { providerId: parsed.value.providerId },
		cookie,
	});
	return NextResponse.json(response, {
		status: adminUpstreamResponseStatus(response, { allowNotFound: true }),
		headers: noStoreHeaders,
	});
}
