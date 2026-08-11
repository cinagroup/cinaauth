import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as oauth from "oauth4webapi";
import {
	createAdminAuthorizationUrl,
	discoverAdminAuthorizationServer,
} from "@/lib/cinaauth/oidc-client";
import { getAdminOidcSecrets } from "@/lib/cinaauth/oidc-secrets";
import {
	ADMIN_OIDC_TRANSACTION_COOKIE,
	getAdminOidcTransactionMode,
	sanitizeAdminCallbackPath,
	sealOidcTransaction,
} from "@/lib/cinaauth/oidc-transaction";

const unavailable = (request: NextRequest) => {
	const url = new URL("/login", request.url);
	url.searchParams.set("error", "oidc_unavailable");
	return NextResponse.redirect(url, 302);
};

/** Starts a confidential Authorization Code + PKCE flow. */
export async function GET(request: NextRequest) {
	try {
		const secrets = await getAdminOidcSecrets();
		const transaction = {
			state: oauth.generateRandomState(),
			nonce: oauth.generateRandomNonce(),
			codeVerifier: oauth.generateRandomCodeVerifier(),
			callbackPath: sanitizeAdminCallbackPath(
				request.nextUrl.searchParams.get("callbackURL"),
			),
			createdAt: Date.now(),
			mode: getAdminOidcTransactionMode(
				request.nextUrl.searchParams.get("mode"),
			),
		};
		const [authorizationServer, transactionCookie] = await Promise.all([
			discoverAdminAuthorizationServer(),
			sealOidcTransaction(
				transaction,
				secrets.CINAADMIN_OIDC_TRANSACTION_SECRET,
			),
		]);
		const authorizationUrl = await createAdminAuthorizationUrl(
			authorizationServer,
			transaction,
		);
		const response = NextResponse.redirect(authorizationUrl, 302);
		response.cookies.set(ADMIN_OIDC_TRANSACTION_COOKIE, transactionCookie, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: 10 * 60,
		});
		response.headers.set("Cache-Control", "no-store");
		response.headers.set("Referrer-Policy", "no-referrer");
		return response;
	} catch {
		return unavailable(request);
	}
}
