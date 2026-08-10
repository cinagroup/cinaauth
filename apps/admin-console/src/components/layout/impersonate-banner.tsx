"use client";

import { useI18n } from "@/lib/i18n/i18n-context";
import { useAdminSession } from "@/hooks/use-admin-session";

/**
 * Persistent, non-dismissible banner shown while an admin is impersonating a
 * user. Stop button calls /api/admin/users/impersonate/stop then reloads.
 *
 * Reads the session via the shared React Query hook (deduped with Topbar /
 * RoleGuard — one request per load, not one per consumer).
 */
export function ImpersonateBanner() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const acting = session?.impersonatedBy
		? session.email ?? session.userId
		: null;

	if (!acting) return null;
	return (
		<div className="flex items-center justify-between border-b border-warning/40 bg-warning-soft px-6 py-2 text-[14px] leading-5 text-warning">
			<span>{t("impersonate.banner", { user: acting })}</span>
			<button
				type="button"
				className="underline underline-offset-4"
				onClick={async () => {
					await fetch("/api/admin/users/impersonate/stop", {
						method: "POST",
					});
					window.location.reload();
				}}
			>
				{t("impersonate.stop")}
			</button>
		</div>
	);
}
