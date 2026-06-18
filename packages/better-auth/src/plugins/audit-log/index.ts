import type { CinaAuthPlugin } from "@cinaauth/core";
import { mergeSchema } from "../../db/schema";
import { PACKAGE_VERSION } from "../../version";
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
		endpoints: {},
		schema: mergeSchema(schema, options?.schema),
		options: opts,
	} satisfies CinaAuthPlugin;
};

export * from "./types";
