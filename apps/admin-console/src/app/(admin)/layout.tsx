import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getAdminPageAccess } from "@/lib/auth-guard";
import { resolveAdminSessionFromCookie } from "@/lib/cinaauth/session";

/**
 * Protected console shell. Middleware provides a fast cookie-presence gate;
 * this server layout performs the authoritative session and role check.
 */
export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const requestHeaders = await headers();
	const cookie = requestHeaders.get("cookie") ?? "";
	const session = await resolveAdminSessionFromCookie(cookie);
	const access = getAdminPageAccess(session);

	if (access === "sign-in") {
		redirect("/login?callbackURL=%2Fdashboard");
	}
	if (access === "forbidden") {
		redirect("/403");
	}

	return <AdminShell>{children}</AdminShell>;
}
