"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { use } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserDTO } from "@/lib/cinaauth/dto";
import { mapUserDTO } from "@/lib/cinaauth/mappers";
import { AdminApiError, fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";
import { UserActions } from "./user-actions";
import { UserTabs } from "./user-tabs";

/**
 * User detail page — client component.
 *
 * Was a server component using cookies() + getUser(), but the edge SSR
 * couldn't reliably forward the session cookie to cinaauth (returned "用户不
 * 存在或加载失败"). Now fetches via the /api/admin/users/[id] proxy (GET),
 * which correctly reads the cookie from the request headers — matching the
 * pattern used by all other pages.
 */
export default function UserDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { t } = useI18n();
	const {
		data: user,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery<UserDTO | null>({
		queryKey: ["user", id],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok?: boolean;
				data?: { user?: Record<string, unknown> };
			}>(`/api/admin/users/${id}`);
			if (!d.data?.user) return null;
			return mapUserDTO(d.data.user);
		},
	});

	if (isLoading) {
		return (
			<div className="space-y-6">
				<PageHeader title="…" backHref="/users" backLabel={t("users.back")} />
				<div className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			</div>
		);
	}

	if (isError) {
		const notFound = error instanceof AdminApiError && error.status === 404;
		return (
			<div className="max-w-2xl">
				<PageHeader
					title={notFound ? t("users.notFound") : t("error.generic.title")}
					backHref="/users"
					backLabel={t("users.back")}
				/>
				{!notFound && (
					<div
						role="alert"
						className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-error/30 bg-error-soft p-4 text-[14px] text-error"
					>
						<span className="flex items-center gap-2">
							<AlertCircle size={16} />
							{t("error.generic.message")}
						</span>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => void refetch()}
						>
							<RefreshCw size={15} />
							{t("error.retry")}
						</Button>
					</div>
				)}
			</div>
		);
	}

	if (!user) {
		return (
			<PageHeader
				title={t("users.notFound")}
				backHref="/users"
				backLabel={t("users.back")}
			/>
		);
	}

	return (
		<div>
			<PageHeader
				title={user.email}
				backHref="/users"
				backLabel={t("users.back")}
			>
				<UserActions
					userId={id}
					banned={user.banned}
					role={user.role}
					twoFactorEnabled={user.twoFactorEnabled}
				/>
			</PageHeader>
			<UserTabs user={user} />
		</div>
	);
}
