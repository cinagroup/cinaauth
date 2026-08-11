import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import type { AdminScimProvider } from "@/lib/integration-contract";
import { parseScimTokenRegistration } from "@/lib/integration-contract";
import {
	readSelectedOrganizationId,
	resolveTenantProvider,
} from "@/lib/integration-tenant-scope";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

/** DELETE /api/admin/scim/tokens/[id] - delete by providerId. */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.scim.manage");
	} catch (error) {
		return error as Response;
	}
	const organizationId = readSelectedOrganizationId(
		request.nextUrl.searchParams.get("organizationId"),
	);
	if (organizationId instanceof Response) return organizationId;
	const parsed = parseScimTokenRegistration({
		providerId: (await params).id,
		organizationId,
	});
	if (!parsed.success) {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "BAD_PROVIDER_ID", message: parsed.message },
			},
			{ status: 400, headers: { "Cache-Control": "no-store" } },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const resolution = await resolveTenantProvider<AdminScimProvider>(
		`/scim/get-provider-connection?providerId=${encodeURIComponent(parsed.value.providerId)}`,
		organizationId,
		cookie,
	);
	if (!resolution.success) return resolution.response;
	const response = await cinaauthFetch("/scim/delete-provider-connection", {
		method: "POST",
		body: { providerId: parsed.value.providerId },
		cookie,
	});
	return NextResponse.json(response, {
		status: adminUpstreamResponseStatus(response, { allowNotFound: true }),
		headers: { "Cache-Control": "no-store" },
	});
}
