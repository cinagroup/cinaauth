import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import type { AdminSsoProvider } from "@/lib/integration-contract";
import { parseOidcSsoRegistration } from "@/lib/integration-contract";
import { readSelectedOrganizationId } from "@/lib/integration-tenant-scope";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const noStoreHeaders = { "Cache-Control": "no-store" };

const badRequest = (message: string) =>
	NextResponse.json(
		{ ok: false, error: { code: "BAD_BODY", message } },
		{ status: 400, headers: noStoreHeaders },
	);

type RegisteredSsoProvider = {
	providerId?: unknown;
	issuer?: unknown;
	domain?: unknown;
	organizationId?: unknown;
	domainVerified?: unknown;
	domainVerificationToken?: unknown;
};

/** GET /api/admin/sso/providers - list tenant-scoped SSO providers. */
export async function GET(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.sso.read");
	} catch (error) {
		return error as Response;
	}
	const organizationId = readSelectedOrganizationId(
		request.nextUrl.searchParams.get("organizationId"),
	);
	if (organizationId instanceof Response) return organizationId;

	const cookie = request.headers.get("cookie") ?? "";
	const response = await cinaauthFetch<{ providers: AdminSsoProvider[] }>(
		"/sso/providers",
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
					message: "CinaSeek Identity returned an invalid SSO provider list",
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

/** POST /api/admin/sso/providers - register a tenant-scoped OIDC provider. */
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
		return badRequest("Invalid JSON");
	}
	const parsed = parseOidcSsoRegistration(input);
	if (!parsed.success) return badRequest(parsed.message);

	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const response = await cinaauthFetch<RegisteredSsoProvider>("/sso/register", {
		method: "POST",
		body: parsed.value,
		cookie,
	});
	if (!response.ok) {
		return NextResponse.json(response, {
			status: adminUpstreamResponseStatus(response),
			headers: noStoreHeaders,
		});
	}

	const provider = response.data;
	if (
		!provider ||
		typeof provider.providerId !== "string" ||
		typeof provider.issuer !== "string" ||
		typeof provider.domain !== "string" ||
		provider.organizationId !== parsed.value.organizationId
	) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "CINAUTH_INVALID_RESPONSE",
					message: "CinaSeek Identity returned an invalid SSO provider",
				},
			},
			{ status: 502, headers: noStoreHeaders },
		);
	}

	return NextResponse.json(
		{
			ok: true,
			data: {
				providerId: provider.providerId,
				type: "oidc",
				issuer: provider.issuer,
				domain: provider.domain,
				organizationId: parsed.value.organizationId,
				domainVerified: provider.domainVerified === true,
				...(typeof provider.domainVerificationToken === "string"
					? { domainVerificationToken: provider.domainVerificationToken }
					: {}),
			},
		},
		{ headers: noStoreHeaders },
	);
}
