import type { GenericEndpointContext } from "@cinaauth/core";
import { getFreshSessionFromCtx } from "../../api";

/**
 * Require a fresh authoritative session only when password verification is not
 * available for a passwordless 2FA-management request.
 */
export async function enforceFreshPasswordlessSession(
	ctx: GenericEndpointContext,
	requirePassword: boolean,
	requireFreshSessionForPasswordless: boolean | undefined,
) {
	if (!requirePassword && requireFreshSessionForPasswordless) {
		await getFreshSessionFromCtx(ctx);
	}
}
