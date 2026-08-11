import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
	ADMIN_OIDC_AUTH_TIME_HEADER,
	ADMIN_OIDC_STEP_UP_MAX_AGE_SECONDS,
} from "@cinaauth/auth-web-contract";
import { cinaauthConfig } from "@/lib/cinaauth/config";
import { fetchAuthRequest } from "@/lib/cinaauth/fetcher";
import {
	discoverAdminAuthorizationServer,
	exchangeAdminAuthorizationCode,
	getAdminOidcFailureDetails,
	hasRequiredAdminAuthenticationProof,
} from "@/lib/cinaauth/oidc-client";
import { getAdminOidcSecrets } from "@/lib/cinaauth/oidc-secrets";
import {
	ADMIN_OIDC_RECENT_AUTH_COOKIE,
	ADMIN_OIDC_TRANSACTION_COOKIE,
	openOidcTransaction,
	sealRecentAuthenticationProof,
} from "@/lib/cinaauth/oidc-transaction";
import {
	splitSetCookieHeader,
	toHostOnlyCookie,
} from "@/lib/cinaauth/proxy-cookie";

type AdminBridgeResponse = {
	ok?: boolean;
	user?: { id?: string; role?: string | null };
};

const clearTransactionCookie = (response: NextResponse) => {
	response.cookies.set(ADMIN_OIDC_TRANSACTION_COOKIE, "", {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});
};

const clearRecentAuthenticationCookie = (response: NextResponse) => {
	response.cookies.set(ADMIN_OIDC_RECENT_AUTH_COOKIE, "", {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		path: "/",
		maxAge: 0,
	});
};

const fail = (request: NextRequest, error: string) => {
	const url = new URL("/login", request.url);
	url.searchParams.set("error", error);
	const response = NextResponse.redirect(url, 302);
	clearTransactionCookie(response);
	clearRecentAuthenticationCookie(response);
	response.headers.set("Cache-Control", "no-store");
	return response;
};

const hasAllowedRole = (role: string | null | undefined) =>
	typeof role === "string" &&
	role
		.split(",")
		.map((candidate) => candidate.trim())
		.some((candidate) => cinaauthConfig.allowedRoles.includes(candidate));

const getSetCookies = (response: Response) => {
	const values = response.headers.getSetCookie?.() ?? [];
	if (values.length > 0) return values;
	const raw = response.headers.get("set-cookie");
	return raw ? splitSetCookieHeader(raw) : [];
};

/** Completes OIDC, verifies Admin authorization, and establishes local session. */
export async function GET(request: NextRequest) {
	const transactionCookie = request.cookies.get(
		ADMIN_OIDC_TRANSACTION_COOKIE,
	)?.value;
	if (!transactionCookie) return fail(request, "invalid_transaction");

	try {
		const secrets = await getAdminOidcSecrets();
		const transaction = await openOidcTransaction(
			transactionCookie,
			secrets.CINAADMIN_OIDC_TRANSACTION_SECRET,
		);
		if (!transaction) return fail(request, "invalid_transaction");

		const authorizationServer = await discoverAdminAuthorizationServer();
		const tokens = await exchangeAdminAuthorizationCode({
			authorizationServer,
			callbackUrl: new URL(request.url),
			transaction,
			clientSecret: secrets.CINAADMIN_OIDC_CLIENT_SECRET,
		});
		if (
			!hasRequiredAdminAuthenticationProof(
				transaction,
				tokens.authenticationTime,
			)
		) {
			return fail(request, "recent_auth_required");
		}
		const recentAuthenticationProof =
			transaction.mode === "step-up" &&
			typeof tokens.authenticationTime === "number"
				? await sealRecentAuthenticationProof(
						tokens.subject,
						tokens.authenticationTime,
						secrets.CINAADMIN_OIDC_TRANSACTION_SECRET,
					)
				: null;
		const bridge = await fetchAuthRequest(
			new Request(
				new URL("/api/auth/admin-oidc/session", cinaauthConfig.baseUrl),
				{
					method: "POST",
						headers: {
							authorization: `Bearer ${tokens.accessToken}`,
							origin: cinaauthConfig.requestOrigin,
							"x-cinaadmin-bridge-secret": secrets.CINAADMIN_OIDC_BRIDGE_SECRET,
							[ADMIN_OIDC_AUTH_TIME_HEADER]: String(
								typeof tokens.authenticationTime === "number" &&
									Number.isInteger(tokens.authenticationTime)
									? tokens.authenticationTime
									: 0,
							),
						},
					cache: "no-store",
				},
			),
		);
		const body = (await bridge
			.json()
			.catch(() => null)) as AdminBridgeResponse | null;
		const setCookies = getSetCookies(bridge);
		if (
			!bridge.ok ||
			body?.ok !== true ||
			body.user?.id !== tokens.subject ||
			!hasAllowedRole(body.user.role) ||
			!setCookies.some((cookie) => cookie.includes("session_token="))
		) {
			return fail(request, "admin_forbidden");
		}

		const destination = new URL(transaction.callbackPath, request.url);
		const response = NextResponse.redirect(destination, 302);
		clearTransactionCookie(response);
		if (recentAuthenticationProof && tokens.authenticationTime !== undefined) {
			response.cookies.set(
				ADMIN_OIDC_RECENT_AUTH_COOKIE,
				recentAuthenticationProof,
				{
					httpOnly: true,
					secure: true,
					sameSite: "strict",
					path: "/",
					maxAge: Math.max(
						0,
						tokens.authenticationTime +
							ADMIN_OIDC_STEP_UP_MAX_AGE_SECONDS -
							Math.floor(Date.now() / 1000),
					),
				},
			);
		} else {
			clearRecentAuthenticationCookie(response);
		}
		for (const cookie of setCookies) {
			response.headers.append("set-cookie", toHostOnlyCookie(cookie));
		}
		response.headers.set("Cache-Control", "no-store");
		return response;
	} catch (error) {
		console.error(
			JSON.stringify({
				level: "error",
				message: "cinaadmin.oidc_callback_failed",
				...getAdminOidcFailureDetails(error),
			}),
		);
		return fail(request, "oidc_failed");
	}
}
