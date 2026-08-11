import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import type { BillingScope } from "@/lib/cinaauth/subscription-contract";
import {
	isBillingAction,
	isBillingScope,
	isRecord,
	isTrustedBillingRedirect,
	normalizeSubscriptionList,
	resolveSameOriginReturnUrl,
} from "@/lib/cinaauth/subscription-contract";
import type { AdminSession } from "@/lib/cinaauth/types";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

type BillingScopeContext = {
	scope: BillingScope;
	referenceId: string;
	upstreamBody:
		| { customerType: "user" }
		| {
				customerType: "organization";
				referenceId: string;
		  };
};

const errorResponse = (status: 400 | 502, code: string, message: string) =>
	NextResponse.json(
		{ ok: false, error: { code, message, status } },
		{ status },
	);

const validIdentifier = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length > 0 &&
	value.length <= 255 &&
	value.trim() === value;

const getScopeContext = (
	session: AdminSession,
	scope: BillingScope,
	organizationId: unknown,
): BillingScopeContext | Response => {
	if (scope === "user") {
		if (organizationId !== null && organizationId !== undefined) {
			return errorResponse(
				400,
				"ORGANIZATION_SCOPE_MISMATCH",
				"organizationId is only valid for organization billing scope",
			);
		}
		return {
			scope,
			referenceId: session.userId,
			upstreamBody: { customerType: "user" },
		};
	}
	if (organizationId === null || organizationId === undefined) {
		return errorResponse(
			400,
			"ORGANIZATION_ID_REQUIRED",
			"An organization ID is required for organization billing scope",
		);
	}
	if (!validIdentifier(organizationId)) {
		return errorResponse(
			400,
			"INVALID_ORGANIZATION_ID",
			"organizationId must be a non-empty string of at most 255 characters",
		);
	}
	return {
		scope,
		referenceId: organizationId,
		upstreamBody: {
			customerType: "organization",
			referenceId: organizationId,
		},
	};
};

const getAuthorizedSession = async (
	request: NextRequest,
	permission: "billing.subscription.read" | "billing.subscription.manage",
) => {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, permission);
		return session;
	} catch (error) {
		return error as Response;
	}
};

/** GET /api/admin/subscriptions — list only the actor or explicitly selected organization. */
export async function GET(request: NextRequest) {
	const session = await getAuthorizedSession(
		request,
		"billing.subscription.read",
	);
	if (session instanceof Response) return session;

	const requestedScope = request.nextUrl.searchParams.get("scope") ?? "user";
	if (!isBillingScope(requestedScope)) {
		return errorResponse(400, "INVALID_BILLING_SCOPE", "Invalid billing scope");
	}
	const scope = getScopeContext(
		session,
		requestedScope,
		request.nextUrl.searchParams.get("organizationId"),
	);
	if (scope instanceof Response) return scope;

	const query =
		scope.scope === "organization"
			? `?${new URLSearchParams({
					customerType: "organization",
					referenceId: scope.referenceId,
				}).toString()}`
			: "";
	const upstream = await cinaauthFetch<unknown>(`/subscription/list${query}`, {
		cookie: request.headers.get("cookie") ?? "",
	});
	if (!upstream.ok) {
		return NextResponse.json(upstream, {
			status: adminUpstreamResponseStatus(upstream),
		});
	}
	const subscriptions = normalizeSubscriptionList(upstream.data);
	if (!subscriptions) {
		return errorResponse(
			502,
			"INVALID_SUBSCRIPTION_RESPONSE",
			"CinaSeek returned an invalid subscription list",
		);
	}

	return NextResponse.json({
		ok: true,
		data: {
			scope: scope.scope,
			referenceId: scope.referenceId,
			subscriptions,
		},
	});
}

const validPlan = (value: unknown) =>
	typeof value === "string" && value.length > 0 && value.length <= 128;

/** POST /api/admin/subscriptions — open a scoped Stripe billing workflow. */
export async function POST(request: NextRequest) {
	const session = await getAuthorizedSession(
		request,
		"billing.subscription.manage",
	);
	if (session instanceof Response) return session;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return errorResponse(
			400,
			"INVALID_JSON",
			"Request body must be valid JSON",
		);
	}
	if (!isRecord(body) || !isBillingAction(body.action)) {
		return errorResponse(400, "BAD_REQUEST", "Unknown billing action");
	}
	const requestedScope = body.scope ?? "user";
	if (!isBillingScope(requestedScope)) {
		return errorResponse(400, "INVALID_BILLING_SCOPE", "Invalid billing scope");
	}
	const scope = getScopeContext(session, requestedScope, body.organizationId);
	if (scope instanceof Response) return scope;
	const returnUrl = resolveSameOriginReturnUrl(request.url, body.returnUrl);
	if (!returnUrl) {
		return errorResponse(
			400,
			"INVALID_RETURN_URL",
			"returnUrl must be a same-origin path",
		);
	}

	let endpoint: string;
	let upstreamBody: Record<string, unknown>;
	if (body.action === "cancel") {
		if (!validIdentifier(body.subscriptionId)) {
			return errorResponse(
				400,
				"SUBSCRIPTION_ID_REQUIRED",
				"A Stripe subscription ID is required",
			);
		}
		endpoint = "/subscription/cancel";
		upstreamBody = {
			...scope.upstreamBody,
			subscriptionId: body.subscriptionId,
			returnUrl,
			disableRedirect: true,
		};
	} else if (body.action === "portal") {
		if (
			body.locale !== undefined &&
			(typeof body.locale !== "string" || body.locale.length > 35)
		) {
			return errorResponse(400, "INVALID_LOCALE", "Invalid billing locale");
		}
		endpoint = "/subscription/billing-portal";
		upstreamBody = {
			...scope.upstreamBody,
			returnUrl,
			disableRedirect: true,
			...(typeof body.locale === "string" ? { locale: body.locale } : {}),
		};
	} else {
		if (!validPlan(body.plan)) {
			return errorResponse(400, "PLAN_REQUIRED", "A plan is required");
		}
		const successUrl = resolveSameOriginReturnUrl(
			request.url,
			body.successUrl ?? body.returnUrl,
		);
		const cancelUrl = resolveSameOriginReturnUrl(
			request.url,
			body.cancelUrl ?? body.returnUrl,
		);
		if (!successUrl || !cancelUrl) {
			return errorResponse(
				400,
				"INVALID_CHECKOUT_URL",
				"Checkout URLs must be same-origin paths",
			);
		}
		if (
			body.subscriptionId !== undefined &&
			!validIdentifier(body.subscriptionId)
		) {
			return errorResponse(
				400,
				"INVALID_SUBSCRIPTION_ID",
				"Invalid Stripe subscription ID",
			);
		}
		if (body.annual !== undefined && typeof body.annual !== "boolean") {
			return errorResponse(400, "INVALID_ANNUAL", "annual must be boolean");
		}
		endpoint = "/subscription/upgrade";
		upstreamBody = {
			...scope.upstreamBody,
			plan: body.plan,
			returnUrl,
			successUrl,
			cancelUrl,
			disableRedirect: true,
			...(typeof body.subscriptionId === "string"
				? { subscriptionId: body.subscriptionId }
				: {}),
			...(typeof body.annual === "boolean" ? { annual: body.annual } : {}),
		};
	}

	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const upstream = await cinaauthFetch<unknown>(endpoint, {
		method: "POST",
		body: upstreamBody,
		cookie: request.headers.get("cookie") ?? "",
	});
	if (!upstream.ok) {
		return NextResponse.json(upstream, {
			status: adminUpstreamResponseStatus(upstream),
		});
	}
	if (
		!isRecord(upstream.data) ||
		!isTrustedBillingRedirect(upstream.data.url, request.url)
	) {
		return errorResponse(
			502,
			"INVALID_BILLING_REDIRECT",
			"CinaSeek returned an untrusted billing redirect",
		);
	}

	return NextResponse.json({
		ok: true,
		data: { url: upstream.data.url, scope: scope.scope },
	});
}
