import type { AuthContext } from "@cinaauth/core";
import { createAuthEndpoint } from "@cinaauth/core/api";

export function deleteAllExpiredApiKeysEndpoint({
	deleteAllExpiredApiKeys,
}: {
	deleteAllExpiredApiKeys(
		ctx: AuthContext,
		byPassLastCheckTime?: boolean | undefined,
	): Promise<void>;
}) {
	return createAuthEndpoint.serverOnly(
		{
			method: "POST",
		},
		async (ctx) => {
			try {
				await deleteAllExpiredApiKeys(ctx.context, true);
			} catch (error) {
				ctx.context.logger.error(
					"[API KEY PLUGIN] Failed to delete expired API keys:",
					error,
				);
				return ctx.json({
					success: false,
					error: error,
				});
			}

			return ctx.json({ success: true, error: null });
		},
	);
}
