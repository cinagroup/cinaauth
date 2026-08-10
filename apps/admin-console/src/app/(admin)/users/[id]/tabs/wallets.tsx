"use client";

import { useQuery } from "@tanstack/react-query";
import {
	getCoreRowModel,
	useReactTable,
	type ColumnDef,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { fetchAdminJson } from "@/lib/client-api";
import type { WalletDTO } from "@/lib/cinaauth/dto";

export function WalletsTab({ userId }: { userId: string }) {
	const { t } = useI18n();
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["user", userId, "wallets"],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok: boolean;
				data?: { wallets: WalletDTO[] };
			}>(`/api/admin/users/${userId}/wallets`);
			return d.data?.wallets ?? [];
		},
	});

	const wallets = data ?? [];

	const unbind = async (w: WalletDTO) => {
		const r = await fetch(`/api/admin/users/${userId}/wallets/${w.address}`, {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ chainId: w.chainId }),
		});
		if (r.ok) {
			toast.success(t("toast.walletUnbound"));
			await refetch();
			return true;
		} else {
			toast.error(t("toast.actionFailed"));
			return false;
		}
	};

	const columns: ColumnDef<WalletDTO>[] = [
		{
			accessorKey: "address",
			header: t("wallets.col.address"),
			cell: ({ row }) => (
				<span className="font-mono text-xs">{row.original.address}</span>
			),
		},
		{ accessorKey: "chainId", header: t("wallets.col.chainId") },
		{
			header: t("wallets.col.primary"),
			cell: ({ row }) =>
				row.original.isPrimary ? <Badge variant="success">{t("wallets.col.primary")}</Badge> : null,
		},
		{
			accessorKey: "boundAt",
			header: t("wallets.col.boundAt"),
			cell: ({ row }) => new Date(row.original.boundAt).toLocaleString(),
		},
		{ accessorKey: "boundIp", header: t("wallets.col.boundIp") },
		{ accessorKey: "boundSite", header: t("wallets.col.boundSite") },
		{
			id: "actions",
			header: t("wallets.col.action"),
			cell: ({ row }) => (
				<RoleGuard allow={["super_admin", "security_admin"]}>
					<ConfirmDialog
						trigger={
							<Button variant="ghost" size="sm" className="text-error">{t("wallets.unbind")}</Button>
						}
						title={t("wallets.unbind.title")}
						description={`${t("wallets.unbind.hint")} ${row.original.address}`}
						danger
						confirmText={t("wallets.unbind")}
						onConfirm={() => unbind(row.original)}
					/>
				</RoleGuard>
			),
		},
	];

	const table = useReactTable({
		data: wallets,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<DataTable
			table={table}
			emptyLabel={t("wallets.empty")}
			isLoading={isFetching && !data}
			isError={isError}
			onRetry={() => void refetch()}
		/>
	);
}
