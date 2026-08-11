import type {
	AdminControlPermission,
	ConfigurationOperationResult,
	ConfigurationParseResult,
} from "@cinaauth/auth-web-contract";
import {
	parseConfigurationOperationResult,
	parseDeliveryConfigurationStatus,
	parseErasureConfigurationStatus,
} from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthConfig } from "@/lib/cinaauth/config";
import { cinaauthControlFetch } from "@/lib/cinaauth/control-client";
import { isAllowedProxyOrigin } from "@/lib/cinaauth/proxy-origin";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const MAX_CONFIGURATION_BODY_BYTES = 32_768;
const PASSTHROUGH_UPSTREAM_STATUSES = new Set([401, 403, 409, 429, 503]);
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type ConfigurationDomain = "delivery" | "erasure";
type ConfigurationMutation = "stage" | "test" | "activate" | "rollback";

const jsonNoStore = (body: unknown, status: number) =>
	NextResponse.json(body, { status, headers: NO_STORE_HEADERS });

const clientError = (status: number, code: string, message: string) =>
	jsonNoStore({ ok: false, error: { code, message, status } }, status);

const normalizeResponseError = (response: Response): Response => {
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", "no-store");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};

const upstreamFailure = (response: {
	error?: { code: string; message: string; status?: number };
}) => {
	const upstreamStatus = response.error?.status;
	const status =
		typeof upstreamStatus === "number" &&
		PASSTHROUGH_UPSTREAM_STATUSES.has(upstreamStatus)
			? upstreamStatus
			: 502;
	const error =
		status !== 502 && response.error
			? { ...response.error, status }
			: {
					code: "CINAUTH_CONTROL_FAILED",
					message: "CinaSeek Identity request failed",
					status: 502,
				};
	return jsonNoStore({ ok: false, error }, status);
};

const strictJson = async (
	request: NextRequest,
): Promise<unknown | Response> => {
	if (
		!isAllowedProxyOrigin(
			request.headers.get("origin"),
			cinaauthConfig.adminOrigin,
		)
	) {
		return clientError(403, "INVALID_ORIGIN", "Invalid request origin");
	}
	const contentType = request.headers.get("content-type")?.split(";", 1)[0];
	if (contentType?.trim().toLowerCase() !== "application/json") {
		return clientError(
			415,
			"UNSUPPORTED_MEDIA_TYPE",
			"Content-Type must be application/json",
		);
	}
	const declaredLength = Number(request.headers.get("content-length") ?? "0");
	if (
		Number.isFinite(declaredLength) &&
		declaredLength > MAX_CONFIGURATION_BODY_BYTES
	) {
		return clientError(413, "BODY_TOO_LARGE", "Request body is too large");
	}
	const text = await request.text();
	if (
		new TextEncoder().encode(text).byteLength > MAX_CONFIGURATION_BODY_BYTES
	) {
		return clientError(413, "BODY_TOO_LARGE", "Request body is too large");
	}
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return clientError(400, "INVALID_JSON", "Invalid JSON");
	}
};

const statusParser = (domain: ConfigurationDomain) =>
	domain === "delivery"
		? parseDeliveryConfigurationStatus
		: parseErasureConfigurationStatus;

/** Browser GET facade over the Auth Worker's authenticated POST status API. */
export const readConfigurationStatus = async (
	request: NextRequest,
	domain: ConfigurationDomain,
	permission: AdminControlPermission,
): Promise<Response> => {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return normalizeResponseError(session);
	try {
		requireAdminControlPermission(session, permission);
	} catch (error) {
		return normalizeResponseError(error as Response);
	}

	const upstream = await cinaauthControlFetch<unknown>(
		`/api/admin/configuration/${domain}/status`,
		{ cookie: request.headers.get("cookie") ?? "", body: {} },
	);
	if (!upstream.ok) return upstreamFailure(upstream);
	const parsed = statusParser(domain)(upstream.data);
	if (!parsed.ok) {
		return clientError(
			502,
			"CINAUTH_INVALID_CONFIGURATION_STATUS",
			parsed.message,
		);
	}
	return jsonNoStore({ ok: true, data: parsed.value }, 200);
};

/** Enforce the shared high-risk mutation boundary before proxying to Auth. */
export const mutateConfiguration = async <T>(
	request: NextRequest,
	domain: ConfigurationDomain,
	operation: ConfigurationMutation,
	permission: AdminControlPermission,
	parse: (input: unknown) => ConfigurationParseResult<T>,
): Promise<Response> => {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return normalizeResponseError(session);
	try {
		requireAdminControlPermission(session, permission);
	} catch (error) {
		return normalizeResponseError(error as Response);
	}
	if (session.impersonatedBy) {
		return clientError(
			403,
			"IMPERSONATED_SESSION_FORBIDDEN",
			"Configuration changes are unavailable while impersonating",
		);
	}

	const input = await strictJson(request);
	if (input instanceof Response) return input;
	const parsed = parse(input);
	if (!parsed.ok)
		return clientError(400, "INVALID_CONFIGURATION", parsed.message);

	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return normalizeResponseError(error as Response);
	}

	const upstream = await cinaauthControlFetch<ConfigurationOperationResult>(
		`/api/admin/configuration/${domain}/${operation}`,
		{
			cookie: request.headers.get("cookie") ?? "",
			body: parsed.value,
		},
	);
	if (!upstream.ok) return upstreamFailure(upstream);
	const result = parseConfigurationOperationResult(upstream.data);
	if (!result.ok) {
		return clientError(
			502,
			"CINAUTH_INVALID_CONFIGURATION_RESULT",
			result.message,
		);
	}
	return jsonNoStore({ ok: true, data: result.value }, 200);
};
