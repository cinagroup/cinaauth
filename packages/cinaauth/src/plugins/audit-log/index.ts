import type { CinaAuthPlugin } from "@cinaauth/core";
import { createAuthMiddleware } from "@cinaauth/core/api";
import { mergeSchema } from "../../db/schema";
import { PACKAGE_VERSION } from "../../version";
import {
	extractActorFromCtx,
	matchCapturePath,
	resolveAuditCaptureResponse,
	resolveOrganizationAuditTarget,
	writeAuditLog,
} from "./capture";
import {
	auditAlerts,
	exportAudit,
	listAudit,
	listOrganizationAudit,
	logAudit,
} from "./routes";
import { schema } from "./schema";
import type { AuditLogPluginOptions } from "./types";

declare module "@cinaauth/core" {
	interface CinaAuthPluginRegistry<AuthOptions, Options> {
		auditLog: {
			creator: typeof auditLog;
		};
	}
}

export const auditLog = (options?: AuditLogPluginOptions) => {
	type ResolvedOptions = Required<
		Pick<
			AuditLogPluginOptions,
			"allowedRoles" | "organizationAllowedRoles" | "writeTokens"
		>
	> &
		Pick<AuditLogPluginOptions, "schema">;
	const opts: ResolvedOptions = {
		...(options ?? {}),
		allowedRoles: options?.allowedRoles ?? ["admin"],
		organizationAllowedRoles: options?.organizationAllowedRoles ?? [
			"owner",
			"admin",
		],
		writeTokens: options?.writeTokens ?? [],
	};

	return {
		id: "audit-log",
		version: PACKAGE_VERSION,
		hooks: {
			after: [
				{
					matcher(context) {
						return matchCapturePath(context.path, context.method) !== null;
					},
					handler: createAuthMiddleware(async (ctx) => {
						const mapped = matchCapturePath(ctx.path as string, ctx.method);
						if (!mapped) {
							return;
						}
						const { ok, response } = await resolveAuditCaptureResponse<{
							user?: { id?: string };
							walletAddress?: string;
							chainId?: number;
						}>(ctx);
						const actor = extractActorFromCtx(ctx);

						// SIWE mutations expose the same minimal target metadata so bind
						// history can enrich admin views and lifecycle events remain
						// attributable without storing signed messages or signatures.
						let targetType: string | null = null;
						let targetId: string | null = null;
						let metadata: Record<string, unknown> | null = null;
						if (mapped.action.startsWith("siwe.") && response) {
							targetType = "wallet";
							targetId = response.user?.id ?? actor.actorId ?? null;
							metadata = {
								address: response.walletAddress ?? null,
								chainId: response.chainId ?? null,
							};
						}
						if (mapped.category === "org") {
							targetId = resolveOrganizationAuditTarget(
								ctx,
								response,
								mapped.action,
							);
							targetType = targetId ? "organization" : null;
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
			listOrganizationAudit: listOrganizationAudit(opts),
			logAudit: logAudit(opts),
			exportAudit: exportAudit(opts),
			auditAlerts: auditAlerts(opts),
		},
		schema: mergeSchema(schema, options?.schema),
		options: opts,
	} satisfies CinaAuthPlugin;
};

export * from "./types";
