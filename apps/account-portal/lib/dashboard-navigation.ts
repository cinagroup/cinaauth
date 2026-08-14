export const DASHBOARD_NAVIGATION = [
	{ href: "/dashboard", label: "Account overview", group: null },
	{ href: "/dashboard/security", label: "Security", group: "My account" },
	{ href: "/dashboard/privacy", label: "Privacy", group: "My account" },
	{
		href: "/dashboard/organization",
		label: "Organization",
		group: "Workspace",
	},
	{
		href: "/dashboard/developer",
		label: "Developer",
		group: "Developer",
	},
] as const;

export type DashboardNavigationHref =
	(typeof DASHBOARD_NAVIGATION)[number]["href"];

const AUTHENTICATION_PATH_PREFIXES = [
	"/forgot-password",
	"/reset-password",
	"/sign-in",
	"/sign-up",
] as const;

/** Keeps focused authentication flows outside the public marketing chrome. */
export function isAuthenticationPath(pathname: string) {
	return AUTHENTICATION_PATH_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

export function isDashboardPath(pathname: string) {
	return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isDashboardNavigationActive(
	pathname: string,
	href: DashboardNavigationHref,
) {
	if (href === "/dashboard") return pathname === href;
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveDashboardNavigationItem(pathname: string) {
	return DASHBOARD_NAVIGATION.find((item) =>
		isDashboardNavigationActive(pathname, item.href),
	);
}
