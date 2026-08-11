"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BatchActionBar } from "@/components/data-table/batch-action-bar";
import { DataTable } from "@/components/data-table/data-table";
import type { FilterState } from "@/components/data-table/filter-bar";
import { FilterBar } from "@/components/data-table/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGuard } from "@/components/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/ui/pagination";
import type { UserDTO } from "@/lib/cinaauth/dto";
import { downloadAdminCsv, fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

const PAGE_SIZE = 20;

export default function UsersPage() {
	const { t } = useI18n();
	const router = useRouter();
	const [filter, setFilter] = useState<FilterState>({});
	const [offset, setOffset] = useState(0);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["users", filter, offset],
		queryFn: async () => {
			const params = new URLSearchParams({
				limit: String(PAGE_SIZE),
				offset: String(offset),
				...(filter.searchField ? { searchField: filter.searchField } : {}),
				...(filter.searchValue ? { searchValue: filter.searchValue } : {}),
			});
			return fetchAdminJson<{
				ok: boolean;
				data?: { users: UserDTO[]; total: number };
			}>(`/api/admin/users?${params}`);
		},
		placeholderData: keepPreviousData,
	});

	const users = data?.data?.users ?? [];
	const total = data?.data?.total ?? 0;

	const columns = useMemo<ColumnDef<UserDTO>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label={t("table.selectAll")}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						onClick={(e) => e.stopPropagation()}
						aria-label={t("table.selectRow")}
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "email",
				header: t("users.col.email"),
				cell: ({ row }) => (
					<span className="font-medium text-ink">{row.original.email}</span>
				),
			},
			{ accessorKey: "name", header: t("users.col.name") },
			{ accessorKey: "role", header: t("users.col.role") },
			{
				header: t("users.col.status"),
				cell: ({ row }) =>
					row.original.banned ? (
						<Badge variant="danger">{t("users.status.banned")}</Badge>
					) : (
						<Badge variant="success">{t("users.status.active")}</Badge>
					),
			},
			{
				accessorKey: "createdAt",
				header: t("users.col.createdAt"),
				cell: ({ row }) =>
					new Date(row.original.createdAt).toLocaleDateString(),
			},
		],
		[t],
	);

	const table = useReactTable({
		data: users,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		state: { rowSelection },
		getRowId: (row) => row.id,
	});

	const selectedIds = Object.keys(rowSelection);
	const exportHref = `/api/admin/export?kind=users&${new URLSearchParams(
		filter as Record<string, string>,
	)}`;

	return (
		<div>
			<PageHeader title={t("users.title")}>
				<Button
					variant="secondary"
					size="sm"
					onClick={() => void downloadAdminCsv(exportHref, "users.csv")}
				>
					<Download size={15} />
					{t("common.export")}
				</Button>
				<RoleGuard allow={["super_admin"]}>
					<Button asChild variant="primary" size="sm">
						<Link href="/users/new">
							<Plus size={15} />
							{t("users.create")}
						</Link>
					</Button>
				</RoleGuard>
			</PageHeader>
			<FilterBar
				fields={[
					{ label: t("users.col.email"), value: "email" },
					{ label: t("users.col.name"), value: "name" },
					{ label: t("users.col.wallet"), value: "wallet" },
				]}
				searchLabel={t("common.search")}
				onChange={(f) => {
					setFilter(f);
					setOffset(0);
				}}
			/>
			<DataTable
				table={table}
				emptyLabel={t("users.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
				onRowClick={(user) => router.push(`/users/${user.id}`)}
			/>
			{total > 0 && (
				<Pagination
					offset={offset}
					pageSize={PAGE_SIZE}
					total={total}
					onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
					onNext={() => setOffset(offset + PAGE_SIZE)}
				/>
			)}
			<BatchActionBar
				selectedIds={selectedIds}
				onClear={() => setRowSelection({})}
			/>
		</div>
	);
}
