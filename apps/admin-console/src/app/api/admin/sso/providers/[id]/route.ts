import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import type { AdminSsoProvider } from "@/lib/integration-contract";
import { parseSsoProviderId } from "@/lib/integration-contract";
import {
	readSelectedOrganizationId,
	resolveTenantProvider,
} from "@/lib/integration-tenant-scope";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const noStoreHeaders = { "Cache-Control": "no-store" };

const invalidProviderId = () =>
	NextResponse.json(
		{
			ok: false,
			error: { code: "BAD_PROVIDER_ID", message: "Invalid providerId" },
		},
		{ status: 400, headers: noStoreHeaders },
	);

/** GET /api/admin/sso/providers/[id] - get one tenant-scoped provider. */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.sso.read");
	} catch (error) {
		return error as Response;
	}
	const providerId = parseSsoProviderId((await params).id);
	if (!providerId) return invalidProviderId();
	const organizationId = readSelectedOrganizationId(
		request.nextUrl.searchParams.get("organizationId"),
	);
	if (organizationId instanceof Response) return organizationId;

	const cookie = request.headers.get("cookie") ?? "";
	const resolution = await resolveTenantProvider<AdminSsoProvider>(
		`/sso/get-provider?providerId=${encodeURIComponent(providerId)}`,
		organizationId,
		cookie,
	);
	if (!resolution.success) return resolution.response;
	return NextResponse.json(
		{ ok: true, data: resolution.provider },
		{ headers: noStoreHeaders },
	);
}

/** DELETE /api/admin/sso/providers/[id] - delete by providerId. */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.sso.manage");
	} catch (error) {
		return error as Response;
	}
	const providerId = parseSsoProviderId((await params).id);
	if (!providerId) return invalidProviderId();
	const organizationId = readSelectedOrganizationId(
		request.nextUrl.searchParams.get("organizationId"),
	);
	if (organizationId instanceof Response) return organizationId;
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const resolution = await resolveTenantProvider<AdminSsoProvider>(
		`/sso/get-provider?providerId=${encodeURIComponent(providerId)}`,
		organizationId,
		cookie,
	);
	if (!resolution.success) return resolution.response;
	const response = await cinaauthFetch("/sso/delete-provider", {
		method: "POST",
		body: { providerId },
		cookie,
	});
	return NextResponse.json(response, {
		status: adminUpstreamResponseStatus(response, { allowNotFound: true }),
		headers: noStoreHeaders,
	});
}
