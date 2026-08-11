import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import type { AdminScimProvider } from "@/lib/integration-contract";
import { parseScimTokenRegistration } from "@/lib/integration-contract";
import { readSelectedOrganizationId } from "@/lib/integration-tenant-scope";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const noStoreHeaders = { "Cache-Control": "no-store" };

/** GET /api/admin/scim/tokens - list tenant-scoped SCIM providers. */
export async function GET(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.scim.read");
	} catch (error) {
		return error as Response;
	}
	const organizationId = readSelectedOrganizationId(
		request.nextUrl.searchParams.get("organizationId"),
	);
	if (organizationId instanceof Response) return organizationId;
	const cookie = request.headers.get("cookie") ?? "";
	const response = await cinaauthFetch<{ providers: AdminScimProvider[] }>(
		"/scim/list-provider-connections",
		{ cookie },
	);
	if (!response.ok) {
		return NextResponse.json(response, {
			status: adminUpstreamResponseStatus(response),
			headers: noStoreHeaders,
		});
	}
	if (!Array.isArray(response.data?.providers)) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "CINAUTH_INVALID_RESPONSE",
					message: "CinaSeek Identity returned an invalid SCIM provider list",
				},
			},
			{ status: 502, headers: noStoreHeaders },
		);
	}
	return NextResponse.json(
		{
			ok: true,
			data: {
				providers: response.data.providers.filter(
					(provider) => provider.organizationId === organizationId,
				),
			},
		},
		{ headers: noStoreHeaders },
	);
}

/** POST /api/admin/scim/tokens - generate or rotate a named SCIM token. */
export async function POST(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.scim.manage");
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
	const parsed = parseScimTokenRegistration(input);
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
	const response = await cinaauthFetch<{ scimToken: string }>(
		"/scim/generate-token",
		{ method: "POST", body: parsed.value, cookie },
	);
	return NextResponse.json(response, {
		status: adminUpstreamResponseStatus(response),
		headers: noStoreHeaders,
	});
}
