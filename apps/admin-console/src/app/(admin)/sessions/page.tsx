"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import type { SessionDTO } from "@/lib/cinaauth/dto";
import { fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

const PAGE_SIZE = 50;

type AdminSessionRow = SessionDTO & {
	impersonatedBy?: string | null;
};

type SessionInventory = {
	sessions: AdminSessionRow[];
	total: number;
};

export default function SessionsPage() {
	const { t } = useI18n();
	const [offset, setOffset] = useState(0);
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["sessions", "platform", offset],
		queryFn: async (): Promise<SessionInventory> => {
			const d = await fetchAdminJson<{
				ok: boolean;
				data?: SessionInventory;
			}>(
				`/api/admin/sessions?limit=${PAGE_SIZE}&offset=${offset}&activeOnly=true`,
			);
			return d.data ?? { sessions: [], total: 0 };
		},
	});

	const revoke = useCallback(
		async (sessionId: string) => {
			try {
				await fetchAdminJson("/api/admin/sessions/revoke", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ sessionId }),
				});
				toast.success(t("sessions.revoked"));
				await refetch();
				return true;
			} catch {
				toast.error(t("toast.actionFailed"));
				return false;
			}
		},
		[refetch, t],
	);

	const sessions = data?.sessions ?? [];
	const total = data?.total ?? 0;

	const columns = useMemo<ColumnDef<AdminSessionRow>[]>(
		() => [
			{
				accessorKey: "userId",
				header: t("sessions.col.userId"),
				cell: ({ row }) => (
					<Link
						href={`/users/${row.original.userId}`}
						className="font-medium text-link hover:underline"
					>
						{row.original.userId}
					</Link>
				),
			},
			{
				accessorKey: "createdAt",
				header: t("sessions.col.createdAt"),
				cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
			},
			{
				accessorKey: "expiresAt",
				header: t("sessions.col.expiresAt"),
				cell: ({ row }) => new Date(row.original.expiresAt).toLocaleString(),
			},
			{
				accessorKey: "ipAddress",
				header: t("sessions.col.ip"),
				cell: ({ row }) => row.original.ipAddress ?? "—",
			},
			{
				accessorKey: "userAgent",
				header: t("sessions.col.device"),
				cell: ({ row }) => row.original.userAgent ?? "—",
			},
			{
				id: "actions",
				header: t("sessions.col.actions"),
				cell: ({ row }) => (
					<RoleGuard allow={["super_admin", "security_admin"]}>
						<ConfirmDialog
							trigger={
								<Button variant="ghost" size="sm" className="text-error">
									{t("sessions.revoke")}
								</Button>
							}
							title={t("sessions.revokeTitle")}
							description={t("sessions.revokeConfirm")}
							confirmText={t("sessions.revokeAction")}
							danger
							onConfirm={() => revoke(row.original.id)}
						/>
					</RoleGuard>
				),
			},
		],
		[revoke, t],
	);

	const table = useReactTable({
		data: sessions,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div>
			<PageHeader
				title={t("sessions.title")}
				description={t("sessions.platformScope")}
			/>
			<DataTable
				table={table}
				emptyLabel={t("sessions.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>
			<Pagination
				offset={offset}
				pageSize={PAGE_SIZE}
				total={total}
				onPrev={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
				onNext={() => setOffset((current) => current + PAGE_SIZE)}
			/>
		</div>
	);
}
