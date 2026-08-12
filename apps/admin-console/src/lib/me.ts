import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import type { AdminSession } from "@/lib/cinaauth/types";

const ACCOUNTS_DASHBOARD_ORIGIN = "https://accounts.cinaseek.ai";

export type MeSectionKey =
	| "security"
	| "privacy"
	| "organization"
	| "developer"
	| "billing";

export interface MeSection {
	key: MeSectionKey;
	href: `/me/${MeSectionKey}`;
	accountsHref: string;
}

export const ME_SECTIONS: readonly MeSection[] = [
	{
		key: "security",
		href: "/me/security",
		accountsHref: `${ACCOUNTS_DASHBOARD_ORIGIN}/dashboard/security`,
	},
	{
		key: "privacy",
		href: "/me/privacy",
		accountsHref: `${ACCOUNTS_DASHBOARD_ORIGIN}/dashboard/privacy`,
	},
	{
		key: "organization",
		href: "/me/organization",
		accountsHref: `${ACCOUNTS_DASHBOARD_ORIGIN}/dashboard/organization`,
	},
	{
		key: "developer",
		href: "/me/developer",
		accountsHref: `${ACCOUNTS_DASHBOARD_ORIGIN}/dashboard/developer`,
	},
	{
		key: "billing",
		href: "/me/billing",
		accountsHref: `${ACCOUNTS_DASHBOARD_ORIGIN}/dashboard`,
	},
];

export type MeSelfServiceAccess = "allowed" | "impersonating" | "unavailable";

/**
 * Decide whether Admin may hand the current browser to Accounts self-service.
 * Impersonated sessions are intentionally kept inside a read-only Admin view.
 */
export function getMeSelfServiceAccess(
	session: Pick<AdminSession, "impersonatedBy" | "role"> | null,
): MeSelfServiceAccess {
	if (!session) return "unavailable";
	if (session.impersonatedBy) return "impersonating";
	return hasAdminControlPermission(session.role, "dashboard.read")
		? "allowed"
		: "unavailable";
}

export function getMeSection(key: MeSectionKey): MeSection {
	const section = ME_SECTIONS.find((candidate) => candidate.key === key);
	if (!section) {
		throw new Error(`Unknown administrator account section: ${key}`);
	}
	return section;
}
