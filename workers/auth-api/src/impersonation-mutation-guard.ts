import type { Context, Env, MiddlewareHandler } from "hono";

// These POST endpoints are either recovery controls or read-only queries.
// New POST routes remain blocked by default until their read-only contract is
// reviewed and added here deliberately.
const IMPERSONATION_SAFE_POST_PATHS = new Set([
	"/api/auth/admin/has-permission",
	"/api/auth/admin/list-user-passkeys",
	"/api/auth/admin/list-user-sessions",
	"/api/auth/admin/stop-impersonating",
	"/api/auth/get-session",
	"/api/auth/is-username-available",
	"/api/auth/organization/check-slug",
	"/api/auth/organization/has-permission",
	"/api/auth/oauth2/endsession",
	"/api/auth/privacy/deletion-receipt/verify",
	"/api/auth/sign-out",
	"/api/auth/verify-password",
]);

const IMPERSONATION_SAFE_POST_PREFIXES = [
	"/api/auth/sso/saml2/logout/",
	"/api/auth/sso/saml2/sp/slo/",
] as const;

// CinaAuth also has GET endpoints that consume tokens, mint credentials, or
// rotate/delete identity state. Keep their exact paths explicit because
// ordinary GET/HEAD account reads remain useful during impersonation.
const IMPERSONATION_MUTATING_GET_PATHS = new Set([
	"/api/auth/delete-user/callback",
	"/api/auth/electron/init-oauth-proxy",
	"/api/auth/magic-link/verify",
	"/api/auth/mcp/authorize",
	"/api/auth/oauth-proxy-callback",
	"/api/auth/oauth-popup/start",
	"/api/auth/oauth2/authorize",
	"/api/auth/one-time-token/generate",
	"/api/auth/passkey/generate-authenticate-options",
	"/api/auth/passkey/generate-register-options",
	"/api/auth/sso/callback",
	"/api/auth/subscription/success",
	"/api/auth/token",
	"/api/auth/verify-email",
]);

const IMPERSONATION_MUTATING_GET_PREFIXES = [
	"/api/auth/callback/",
	"/api/auth/oauth2/callback/",
	"/api/auth/sso/callback/",
	"/api/auth/sso/saml2/callback/",
] as const;

const IMPERSONATION_MUTATING_METHODS = new Set([
	"DELETE",
	"PATCH",
	"POST",
	"PUT",
]);

const canonicalizeAuthPath = (pathname: string) =>
	pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;

const normalizeImpersonationActorId = (
	impersonatedBy: string | null | undefined,
) => {
	if (typeof impersonatedBy !== "string") return undefined;
	const normalized = impersonatedBy.trim();
	return normalized.length > 0 ? normalized : undefined;
};

/**
 * Classifies Auth API requests that may change durable identity state or
 * rotate the active browser session. Recovery and session introspection stay
 * available so an impersonated administrator cannot become trapped.
 */
export const requiresImpersonationMutationGuard = (
	pathname: string,
	method: string,
) => {
	const canonicalPathname = canonicalizeAuthPath(pathname);
	if (!canonicalPathname.startsWith("/api/auth/")) return false;

	const normalizedMethod = method.toUpperCase();
	if (
		normalizedMethod === "POST" &&
		(IMPERSONATION_SAFE_POST_PATHS.has(canonicalPathname) ||
			IMPERSONATION_SAFE_POST_PREFIXES.some((prefix) =>
				canonicalPathname.startsWith(prefix),
			))
	) {
		return false;
	}
	if (normalizedMethod === "GET" || normalizedMethod === "HEAD") {
		return (
			IMPERSONATION_MUTATING_GET_PATHS.has(canonicalPathname) ||
			IMPERSONATION_MUTATING_GET_PREFIXES.some((prefix) =>
				canonicalPathname.startsWith(prefix),
			)
		);
	}
	return IMPERSONATION_MUTATING_METHODS.has(normalizedMethod);
};

export type ImpersonationMutationRejection = {
	status: 403;
	code: "IMPERSONATION_NOT_ALLOWED";
	message: "Account changes are unavailable while impersonating";
};

/** Returns a rejection only when an impersonated session reaches a mutation. */
export const getImpersonationMutationRejection = (
	pathname: string,
	method: string,
	impersonatedBy: string | null | undefined,
): ImpersonationMutationRejection | undefined => {
	if (!normalizeImpersonationActorId(impersonatedBy)) return undefined;
	if (!requiresImpersonationMutationGuard(pathname, method)) return undefined;
	return {
		status: 403,
		code: "IMPERSONATION_NOT_ALLOWED",
		message: "Account changes are unavailable while impersonating",
	};
};

type ImpersonationMutationAuditInput = {
	impersonatedBy: string;
	targetUserId: string;
	pathname: string;
	method: string;
};

/** Builds the secret-free audit payload for a rejected impersonated mutation. */
export const createImpersonationMutationAuditBody = (
	input: ImpersonationMutationAuditInput,
) => ({
	category: "admin",
	action: "admin.impersonation_mutation_rejected",
	result: "failure" as const,
	actorSite: "auth-api",
	targetType: "user",
	targetId: input.targetUserId,
	metadata: {
		actorId: input.impersonatedBy.trim(),
		requestMethod: input.method.toUpperCase(),
		requestPath: canonicalizeAuthPath(input.pathname),
	},
});

/** Authoritative session fields required by the impersonation mutation guard. */
export type ImpersonationMutationGuardSession = {
	user: { id: string };
	session: { impersonatedBy?: string | null };
};

/** Structured, secret-free payload persisted for a rejected mutation. */
export type ImpersonationMutationAuditBody = ReturnType<
	typeof createImpersonationMutationAuditBody
>;

type ImpersonationMutationAuditWriter = {
	serviceKey: string;
	write: (input: {
		headers: Headers;
		body: ImpersonationMutationAuditBody;
	}) => Promise<unknown>;
};

type ImpersonationMutationGuardLogEvent =
	| {
			level: "warn";
			message: "cinaauth.impersonation_mutation.rejected";
			code: "IMPERSONATION_NOT_ALLOWED";
			actorId: string;
			targetUserId: string;
			method: string;
			path: string;
			version: unknown;
	  }
	| {
			level: "error";
			message: "cinaauth.impersonation_mutation.audit_failed";
			code: "IMPERSONATION_NOT_ALLOWED";
			path: string;
			version: unknown;
	  };

type ImpersonationMutationGuardDependencies<E extends Env> = {
	getSession: (
		context: Context<E>,
	) => Promise<ImpersonationMutationGuardSession | null>;
	getAuditWriter: (
		context: Context<E>,
	) => ImpersonationMutationAuditWriter | undefined;
	getVersion: (context: Context<E>) => unknown;
	logEvent: (event: ImpersonationMutationGuardLogEvent) => void;
};

/**
 * Creates the request middleware that enforces the read-only impersonation
 * boundary before any concrete Auth API route or catch-all handler runs.
 */
export const createImpersonationMutationGuardMiddleware =
	<E extends Env>(
		dependencies: ImpersonationMutationGuardDependencies<E>,
	): MiddlewareHandler<E> =>
	async (context, next) => {
		const pathname = new URL(context.req.url).pathname;
		if (!requiresImpersonationMutationGuard(pathname, context.req.method)) {
			await next();
			return;
		}

		const session = await dependencies.getSession(context);
		const impersonatedBy = normalizeImpersonationActorId(
			session?.session.impersonatedBy,
		);
		const rejection = getImpersonationMutationRejection(
			pathname,
			context.req.method,
			impersonatedBy,
		);
		if (!session || !impersonatedBy || !rejection) {
			await next();
			return;
		}

		const auditBody = createImpersonationMutationAuditBody({
			impersonatedBy,
			targetUserId: session.user.id,
			pathname,
			method: context.req.method,
		});
		const version = dependencies.getVersion(context);
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.impersonation_mutation.rejected",
			code: rejection.code,
			actorId: auditBody.metadata.actorId,
			targetUserId: auditBody.targetId,
			method: auditBody.metadata.requestMethod,
			path: auditBody.metadata.requestPath,
			version,
		});

		const auditWriter = dependencies.getAuditWriter(context);
		if (auditWriter) {
			const auditHeaders = new Headers({
				Authorization: `Bearer ${auditWriter.serviceKey}`,
			});
			for (const name of ["cf-connecting-ip", "user-agent"] as const) {
				const value = context.req.raw.headers.get(name);
				if (value) auditHeaders.set(name, value);
			}
			try {
				await auditWriter.write({ headers: auditHeaders, body: auditBody });
			} catch {
				dependencies.logEvent({
					level: "error",
					message: "cinaauth.impersonation_mutation.audit_failed",
					code: rejection.code,
					path: auditBody.metadata.requestPath,
					version,
				});
			}
		}

		const response = context.json(
			{ code: rejection.code, message: rejection.message },
			rejection.status,
		);
		response.headers.set("Cache-Control", "no-store");
		return response;
	};
