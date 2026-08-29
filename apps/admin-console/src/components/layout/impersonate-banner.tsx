"use client";

import { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import { fetchAdminResponse } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * Persistent, non-dismissible banner shown while an admin is impersonating a
 * user. Stop button calls /api/admin/users/impersonate/stop then reloads.
 *
 * Reads the session via the shared React Query hook (deduped with Topbar /
 * RoleGuard — one request per load, not one per consumer).
 */
export function ImpersonateBanner({
	onStopped = () => window.location.reload(),
}: {
	onStopped?: () => void;
} = {}) {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const [pending, setPending] = useState(false);
	const [stopFailed, setStopFailed] = useState(false);
	const acting = session?.impersonatedBy
		? (session.email ?? session.userId)
		: null;

	if (!acting) return null;

	const stopImpersonating = async () => {
		setPending(true);
		setStopFailed(false);
		try {
			const response = await fetchAdminResponse(
				"/api/admin/users/impersonate/stop",
				{ method: "POST" },
			);
			if (!response.ok) {
				setStopFailed(true);
				return;
			}
			onStopped();
		} catch {
			setStopFailed(true);
		} finally {
			setPending(false);
		}
	};

	return (
		<div className="border-b border-warning/40 bg-warning-soft px-4 py-2 text-[14px] leading-5 text-warning sm:px-6">
			<div className="flex items-center justify-between gap-4">
				<span>{t("impersonate.banner", { user: acting })}</span>
				<button
					type="button"
					disabled={pending}
					className="shrink-0 underline underline-offset-4 disabled:cursor-wait disabled:opacity-60"
					onClick={() => void stopImpersonating()}
				>
					{pending ? t("impersonate.stopping") : t("impersonate.stop")}
				</button>
			</div>
			{stopFailed && (
				<p role="alert" className="mt-1 text-[13px] leading-5 text-error">
					{t("impersonate.stopFailed")}
				</p>
			)}
		</div>
	);
}
