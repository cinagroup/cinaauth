import type { NextRequest } from "next/server";
import { getAdminOidcTransactionSecret } from "@/lib/cinaauth/oidc-secrets";
import {
	ADMIN_OIDC_RECENT_AUTH_COOKIE,
	openRecentAuthenticationProof,
} from "@/lib/cinaauth/oidc-transaction";
import type { AdminSession } from "@/lib/cinaauth/types";

const sessionNotFreshResponse = (): Response =>
	new Response(
		JSON.stringify({
			ok: false,
			error: {
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication is required",
				status: 403,
			},
		}),
		{
			status: 403,
			headers: {
				"Cache-Control": "no-store",
				"Content-Type": "application/json",
			},
		},
	);

/** Require a valid recent-auth proof bound to the verified Admin subject. */
export const requireRecentAdminAuthentication = async (
	request: NextRequest,
	session: AdminSession,
): Promise<void> => {
	const value = request.cookies.get(ADMIN_OIDC_RECENT_AUTH_COOKIE)?.value;
	if (!value) throw sessionNotFreshResponse();

	try {
		const secret = await getAdminOidcTransactionSecret();
		const proof = await openRecentAuthenticationProof(
			value,
			secret,
			session.userId,
		);
		if (!proof) throw sessionNotFreshResponse();
	} catch (error) {
		if (error instanceof Response) throw error;
		throw sessionNotFreshResponse();
	}
};
