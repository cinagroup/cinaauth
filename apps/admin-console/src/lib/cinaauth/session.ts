import { AUTH_WEB_ENDPOINTS } from "@cinaauth/auth-web-contract";
import { cinaauthConfig } from "./config";
import { fetchAuthRequest } from "./fetcher";
import type { AdminSession } from "./types";

/**
 * Resolve the cinaauth admin session from a Next.js Request.
 *
 * The session_data cookie is signed by Better Auth. Cinaadmin does not own the
 * signing secret, so it delegates signature verification to cinaauth instead
 * of trusting a locally decoded payload.
 */
export async function resolveAdminSession(
	request: Request,
): Promise<AdminSession | null> {
	const rawCookie = request.headers.get("cookie") ?? "";
	return resolveAdminSessionFromCookie(rawCookie);
}

/** Resolve an Admin session from a server-rendered request's Cookie header. */
export async function resolveAdminSessionFromCookie(
	rawCookie: string,
): Promise<AdminSession | null> {
	if (!rawCookie) return null;

	const sessionData = extractCookie(
		rawCookie,
		"__Secure-cinaauth.session_data",
	);
	const sessionToken = extractCookie(
		rawCookie,
		"__Secure-cinaauth.session_token",
	);
	if (!sessionData && !sessionToken) return null;

	try {
		const res = await fetchAuthRequest(
			new Request(new URL(AUTH_WEB_ENDPOINTS.session, cinaauthConfig.baseUrl), {
				headers: { cookie: rawCookie },
				cache: "no-store",
			}),
		);
		if (res.ok) {
			const data = (await res.json()) as SessionResponse;
			if (data.session && data.user) {
				return toAdminSession(data);
			}
		}
	} catch {
		/* Treat an unreachable identity provider as unauthenticated. */
	}

	return null;
}

function extractCookie(cookieStr: string, name: string): string | null {
	const match = cookieStr.match(new RegExp(`${name}=([^;]+)`));
	return match?.[1] ?? null;
}

function toAdminSession(data: SessionResponse): AdminSession {
	return {
		userId: data.user!.id,
		role: data.user!.role ?? "user",
		email: data.user!.email,
		name: data.user!.name,
		// Better Auth's admin plugin stores impersonatedBy on the session record.
		impersonatedBy:
			data.session?.impersonatedBy ?? data.user!.impersonatedBy ?? null,
		activeOrganizationId: data.activeOrganizationId ?? null,
	};
}

interface SessionUser {
	id: string;
	role?: string;
	email?: string;
	name?: string;
	impersonatedBy?: string | null;
}

interface SessionResponse {
	session?: { userId: string; impersonatedBy?: string | null } | null;
	user?: SessionUser | null;
	activeOrganizationId?: string | null;
}

/** Whether `role` is on the admin whitelist (CINAADMIN_ALLOWED_ROLES). */
export function hasAdminRole(role: string | undefined | null): boolean {
	return (
		role
			?.split(",")
			.some((candidate) => cinaauthConfig.allowedRoles.includes(candidate)) ??
		false
	);
}
