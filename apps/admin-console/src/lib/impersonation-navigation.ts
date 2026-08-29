import type { AdminSession } from "@/lib/cinaauth/types";

/** Keep impersonated sessions inside the read-only account surface. */
export function getImpersonationRedirect(
	session: Pick<AdminSession, "impersonatedBy"> | null | undefined,
	pathname: string,
): "/me" | null {
	if (!session?.impersonatedBy) return null;
	return pathname === "/me" || pathname.startsWith("/me/") ? null : "/me";
}
