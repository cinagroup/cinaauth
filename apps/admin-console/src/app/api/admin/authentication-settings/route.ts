import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const noStoreHeaders = { "Cache-Control": "no-store" };

const SETTING_KEYS = [
	"emailOtpLoginEnabled",
	"emailPasswordLoginEnabled",
	"passkeyLoginEnabled",
	"siweLoginEnabled",
	"googleOneTapEnabled",
] as const;

type AuthenticationSettings = Record<(typeof SETTING_KEYS)[number], boolean>;

type AuthenticationSettingsPayload = {
	settings: AuthenticationSettings & { socialProviderLimit: number };
	methods: Record<string, unknown>;
	activeOAuthProviderCount: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isAuthenticationSettings = (
	value: unknown,
): value is AuthenticationSettings => {
	if (!isRecord(value)) return false;
	const actual = Object.keys(value).sort();
	const expected = [...SETTING_KEYS].sort();
	return (
		actual.length === expected.length &&
		actual.every((key, index) => key === expected[index]) &&
		SETTING_KEYS.every((key) => typeof value[key] === "boolean")
	);
};

const invalidConfiguration = () =>
	NextResponse.json(
		{
			ok: false,
			error: {
				code: "INVALID_AUTHENTICATION_SETTINGS",
				message: "All authentication settings must be booleans",
			},
		},
		{ status: 400, headers: noStoreHeaders },
	);

/** GET /api/admin/authentication-settings - authoritative runtime method audit. */
export async function GET(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "security.policy.read");
	} catch (error) {
		return error as Response;
	}
	const response = await cinaauthFetch<AuthenticationSettingsPayload>(
		"/admin/authentication-settings",
		{ cookie: request.headers.get("cookie") ?? "" },
	);
	if (!response.ok) {
		return NextResponse.json(response, {
			status: adminUpstreamResponseStatus(response),
			headers: noStoreHeaders,
		});
	}
	const data = response.data;
	if (
		!data ||
		!isRecord(data.settings) ||
		!Number.isSafeInteger(data.settings.socialProviderLimit) ||
		!SETTING_KEYS.every((key) => typeof data.settings[key] === "boolean") ||
		!isRecord(data.methods) ||
		!Number.isSafeInteger(data.activeOAuthProviderCount)
	) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "CINAUTH_INVALID_RESPONSE",
					message: "CinaSeek Identity returned invalid authentication settings",
				},
			},
			{ status: 502, headers: noStoreHeaders },
		);
	}
	return NextResponse.json({ ok: true, data }, { headers: noStoreHeaders });
}

/** PUT /api/admin/authentication-settings - governed runtime method switches. */
export async function PUT(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "security.policy.publish");
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
		return invalidConfiguration();
	}
	if (!isAuthenticationSettings(body)) return invalidConfiguration();
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const response = await cinaauthFetch("/admin/authentication-settings", {
		method: "PUT",
		body,
		cookie: request.headers.get("cookie") ?? "",
	});
	return NextResponse.json(response, {
		status: response.ok ? 200 : adminUpstreamResponseStatus(response),
		headers: noStoreHeaders,
	});
}
