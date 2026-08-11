"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { AuditLogDTO } from "@/lib/cinaauth/dto";
import { fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * Login history as a vertical timeline. Each event is a node (accent dot for
 * success, error dot for failure) with timestamp / IP / device on the right.
 * Data source is unchanged: audit log filtered by action=user.login.
 */
export function LoginTrailTab({ userId }: { userId: string }) {
	const { t } = useI18n();
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["user", userId, "login-trail"],
		queryFn: async () => {
			const params = new URLSearchParams({
				limit: "50",
				action: "user.login",
				targetId: userId,
			});
			const d = await fetchAdminJson<{
				ok: boolean;
				data?: { rows: AuditLogDTO[] };
			}>(`/api/admin/audit?${params}`);
			return d.data?.rows ?? [];
		},
	});

	const rows = data ?? [];

	if (isFetching) {
		return (
			<EmptyState>
				<div className="text-[14px] leading-5 text-mute">
					{t("common.loading")}
				</div>
			</EmptyState>
		);
	}
	if (isError) {
		return (
			<EmptyState>
				<AlertCircle size={20} className="text-error" aria-hidden />
				<span>{t("error.generic.message")}</span>
				<Button variant="secondary" size="sm" onClick={() => void refetch()}>
					<RefreshCw size={15} />
					{t("error.retry")}
				</Button>
			</EmptyState>
		);
	}
	if (rows.length === 0) {
		return <EmptyState>{t("loginTrail.empty")}</EmptyState>;
	}

	return (
		<ol className="relative space-y-5 border-l border-hairline pl-6">
			{rows.map((row, i) => {
				const failed = row.result === "failure";
				return (
					<li key={`${row.timestamp}-${i}`} className="relative">
						{/* Timeline node */}
						<span
							className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full ${
								failed
									? "bg-error-soft text-error"
									: "bg-success-soft text-success"
							}`}
						>
							{failed ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
						</span>
						<div
							className={`rounded-[var(--radius-sm)] border border-hairline bg-canvas px-4 py-3 ${
								failed ? "border-error-soft" : ""
							}`}
						>
							<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
								<div className="text-[14px] font-medium leading-5 text-ink">
									{failed ? t("loginTrail.failed") : t("loginTrail.success")}
								</div>
								<div className="font-mono text-[12px] leading-4 text-mute">
									{new Date(row.timestamp).toLocaleString()}
								</div>
							</div>
							<div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-[13px] leading-5 text-body">
								{row.actorIp && (
									<span>
										<span className="text-mute">{t("loginTrail.ipLabel")}</span>
										{row.actorIp}
									</span>
								)}
								{row.actorUa && (
									<span className="max-w-md truncate">
										<span className="text-mute">
											{t("loginTrail.deviceLabel")}
										</span>
										{row.actorUa}
									</span>
								)}
							</div>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
