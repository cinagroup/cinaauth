import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const noStoreHeaders = { "Cache-Control": "no-store" };

type SocialProvidersPayload = {
	catalog?: unknown;
	providers?: unknown;
	settings?: { socialProviderLimit?: unknown };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const unwrapWorkerEnvelope = (value: unknown): unknown =>
	isRecord(value) && value.ok === true && "data" in value ? value.data : value;

const badRequest = (message: string) =>
	NextResponse.json(
		{ ok: false, error: { code: "BAD_BODY", message } },
		{ status: 400, headers: noStoreHeaders },
	);

/** GET /api/admin/social-providers - list runtime social sign-in providers. */
export async function GET(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.social-provider.read");
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const response = await cinaauthFetch<SocialProvidersPayload>(
		"/admin/social-providers",
		{ cookie },
	);
	if (!response.ok) {
		return NextResponse.json(response, {
			status: adminUpstreamResponseStatus(response),
			headers: noStoreHeaders,
		});
	}
	const data = unwrapWorkerEnvelope(response.data) as
		| SocialProvidersPayload
		| undefined;
	const providers = data?.providers;
	const settings = data?.settings;
	if (
		!Array.isArray(providers) ||
		typeof settings?.socialProviderLimit !== "number"
	) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "CINAUTH_INVALID_RESPONSE",
					message:
						"CinaSeek Identity returned an invalid social provider configuration",
				},
			},
			{ status: 502, headers: noStoreHeaders },
		);
	}
	return NextResponse.json({ ok: true, data }, { headers: noStoreHeaders });
}

/** PUT /api/admin/social-providers - stage or update one provider's credentials. */
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
		return badRequest("Invalid JSON");
	}

	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const response = await cinaauthFetch("/admin/social-providers", {
		method: "PUT",
		body,
		cookie,
	});
	return NextResponse.json(response, {
		status: response.ok ? 200 : adminUpstreamResponseStatus(response),
		headers: noStoreHeaders,
	});
}

/** DELETE /api/admin/social-providers - remove a database-staged provider. */
export async function DELETE(request: NextRequest) {
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
		return badRequest("Invalid JSON");
	}

	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const response = await cinaauthFetch("/admin/social-providers", {
		method: "DELETE",
		body,
		cookie,
	});
	return NextResponse.json(response, {
		status: response.ok ? 200 : adminUpstreamResponseStatus(response),
		headers: noStoreHeaders,
	});
}
