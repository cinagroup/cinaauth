import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthConfig } from "@/lib/cinaauth/config";
import type { AdminSsoProvider } from "@/lib/integration-contract";
import { parseSsoProviderId } from "@/lib/integration-contract";
import {
	readSelectedOrganizationId,
	resolveTenantProvider,
} from "@/lib/integration-tenant-scope";

/** GET /api/admin/sso/metadata - return a provider-specific SP metadata URL. */
export async function GET(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.sso.read");
	} catch (error) {
		return error as Response;
	}

	const providerId = parseSsoProviderId(
		request.nextUrl.searchParams.get("providerId"),
	);
	if (!providerId) {
		return NextResponse.json(
			{
				ok: false,
				error: { code: "BAD_PROVIDER_ID", message: "providerId is required" },
			},
			{ status: 400, headers: { "Cache-Control": "no-store" } },
		);
	}
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

	const query = new URLSearchParams({ providerId });
	return NextResponse.json(
		{
			ok: true,
			data: {
				url: `${cinaauthConfig.baseUrl}/api/auth/sso/saml2/sp/metadata?${query.toString()}`,
			},
		},
		{ headers: { "Cache-Control": "no-store" } },
	);
}
