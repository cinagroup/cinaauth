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
import { listAudit, logAudit } from "./routes";

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
						const ok = (await getEndpointResponse(ctx)) !== null;
						const actor = extractActorFromCtx(ctx);
						await writeAuditLog(ctx, {
							...mapped,
							...actor,
							result: ok ? "success" : "failure",
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
		},
		schema: mergeSchema(schema, options?.schema),
		options: opts,
	} satisfies CinaAuthPlugin;
};

export * from "./types";
