"use client";

import { useQuery } from "@tanstack/react-query";
import {
	getCoreRowModel,
	useReactTable,
	type ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { SessionDTO } from "@/lib/cinaauth/dto";
import { fetchAdminJson, fetchAdminResponse } from "@/lib/client-api";

export function SessionsTab({ userId }: { userId: string }) {
	const { t } = useI18n();
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["user", userId, "sessions"],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok: boolean;
				data?: { sessions: SessionDTO[] };
			}>(`/api/admin/users/${userId}/sessions`);
			return d.data?.sessions ?? [];
		},
	});

	const sessions = data ?? [];

	const revokeAll = async () => {
		const r = await fetchAdminResponse("/api/admin/sessions/revoke", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ userId }),
		});
		// Never report success for a failed revoke — an admin cutting off a
		// compromised account must know if the sessions are actually dead.
		if (r.ok) {
			toast.success(t("toast.sessionsRevoked"));
			await refetch();
			return true;
		} else {
			toast.error(t("toast.actionFailed"));
			return false;
		}
	};

	const columns: ColumnDef<SessionDTO>[] = [
		{
			accessorKey: "createdAt",
			header: t("userSessions.col.createdAt"),
			cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
		},
		{
			accessorKey: "expiresAt",
			header: t("userSessions.col.expiresAt"),
			cell: ({ row }) => new Date(row.original.expiresAt).toLocaleString(),
		},
		{ accessorKey: "ipAddress", header: t("userSessions.col.ip") },
		{ accessorKey: "userAgent", header: t("userSessions.col.device") },
	];

	const table = useReactTable({
		data: sessions,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div>
			<div className="mb-4 flex justify-end">
				<RoleGuard allow={["super_admin", "security_admin"]}>
					<ConfirmDialog
						trigger={
							<Button variant="ghost" size="sm" className="text-error">
								{t("userSessions.revokeAll")}
							</Button>
						}
						title={t("userSessions.revokeAll")}
						description={t("userDetail.sessions.revokeConfirm")}
						danger
						confirmText={t("userSessions.revokeAllBtn")}
						onConfirm={revokeAll}
					/>
				</RoleGuard>
			</div>
			<DataTable
				table={table}
				emptyLabel={t("userSessions.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>
		</div>
	);
}
