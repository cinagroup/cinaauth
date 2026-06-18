import type { CinaAuthPlugin } from "@cinaauth/core";
import { createAuthMiddleware } from "@cinaauth/core/api";
import { mergeSchema } from "../../db/schema";
import { getEndpointResponse } from "../../utils/plugin-helper";
import { PACKAGE_VERSION } from "../../version";
import { schema } from "./schema";
import type { AuditLogPluginOptions } from "./types";
import {
	extractActorFromCtx,
	matchCapturePath,
	writeAuditLog,
} from "./capture";
import { auditAlerts, exportAudit, listAudit, logAudit } from "./routes";

declare module "@cinaauth/core" {
	interface CinaAuthPluginRegistry<AuthOptions, Options> {
		auditLog: {
			creator: typeof auditLog;
		};
	}
}

export const auditLog = (options?: AuditLogPluginOptions) => {
	type ResolvedOptions = Required<
		Pick<AuditLogPluginOptions, "allowedRoles" | "writeTokens">
	> &
		Pick<AuditLogPluginOptions, "schema">;
	const opts: ResolvedOptions = {
		...(options ?? {}),
		allowedRoles: options?.allowedRoles ?? ["admin"],
		writeTokens: options?.writeTokens ?? [],
	};

	return {
		id: "audit-log",
		version: PACKAGE_VERSION,
		hooks: {
			after: [
				{
					matcher(context) {
						return matchCapturePath(context.path) !== null;
					},
				handler: createAuthMiddleware(async (ctx) => {
					const mapped = matchCapturePath(ctx.path as string);
					if (!mapped) {
						return;
					}
					// `getEndpointResponse` returns null for non-200 responses or
					// APIErrors (see utils/plugin-helper.ts), so a null result is a
					// reliable failure signal without guessing status fields.
					const response = await getEndpointResponse<{
						user?: { id?: string };
						walletAddress?: string;
						chainId?: number;
					}>(ctx);
					const ok = response !== null;
					const actor = extractActorFromCtx(ctx);

					// For wallet binds, populate targetId (the bound user) and
					// metadata.address/chainId so list-user-wallets can enrich
					// each wallet with its binding IP/site. The siwe /verify
					// response carries {user.id, walletAddress, chainId}.
					let targetType: string | null = null;
					let targetId: string | null = null;
					let metadata: Record<string, unknown> | null = null;
					if (mapped.action === "siwe.bind" && response) {
						targetType = "wallet";
						targetId = response.user?.id ?? actor.actorId ?? null;
						metadata = {
							address: response.walletAddress ?? null,
							chainId: response.chainId ?? null,
						};
					}

					await writeAuditLog(ctx, {
						...mapped,
						...actor,
						result: ok ? "success" : "failure",
						targetType,
						targetId,
						metadata,
					});
					// hooks.after handlers return the (possibly modified) response;
					// we did not alter it, so return nothing to pass through.
				}),
				},
			],
		},
		endpoints: {
			listAudit: listAudit(opts),
			logAudit: logAudit(opts),
			exportAudit: exportAudit(opts),
			auditAlerts: auditAlerts(opts),
		},
		schema: mergeSchema(schema, options?.schema),
		options: opts,
	} satisfies CinaAuthPlugin;
};

export * from "./types";
