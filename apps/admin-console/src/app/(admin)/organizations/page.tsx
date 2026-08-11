"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrgDTO } from "@/lib/cinaauth/dto";
import { fetchAdminJson, fetchAdminResponse } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

export default function OrganizationsPage() {
	const { t } = useI18n();
	const qc = useQueryClient();
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["organizations"],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok: boolean;
				data?: { organizations: OrgDTO[] };
			}>("/api/admin/organizations");
			return d.data?.organizations ?? [];
		},
	});

	const orgs = data ?? [];

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [creating, setCreating] = useState(false);

	const create = async () => {
		if (!name.trim() || !slug.trim()) {
			toast.error(t("toast.actionFailed"));
			return false;
		}
		setCreating(true);
		try {
			const r = await fetchAdminResponse("/api/admin/organizations", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name, slug }),
			});
			if (!r.ok) {
				toast.error(t("toast.createFailed"));
				return false;
			}
			setName("");
			setSlug("");
			await qc.invalidateQueries({ queryKey: ["organizations"] });
			return true;
		} finally {
			setCreating(false);
		}
	};

	const columns = useMemo<ColumnDef<OrgDTO>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("organizations.col.name"),
				cell: ({ row }) => (
					<span className="font-medium text-ink">{row.original.name}</span>
				),
			},
			{ accessorKey: "slug", header: t("organizations.col.slug") },
			{
				accessorKey: "membersCount",
				header: "Members",
				cell: ({ row }) => row.original.membersCount ?? "—",
			},
			{
				accessorKey: "createdAt",
				header: t("organizations.col.createdAt"),
				cell: ({ row }) =>
					new Date(row.original.createdAt).toLocaleDateString(),
			},
		],
		[t],
	);

	const table = useReactTable({
		data: orgs,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div>
			<PageHeader title={t("organizations.title")}>
				<RoleGuard allow={["super_admin"]}>
					<ConfirmDialog
						trigger={
							<Button variant="primary" size="sm">
								<Plus size={15} />
								{t("organizations.create")}
							</Button>
						}
						title={t("organizations.create")}
						confirmText={creating ? t("common.creating") : t("common.create")}
						onConfirm={create}
					>
						<Input
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={t("organizations.name")}
						/>
						<Input
							required
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							placeholder={t("organizations.slug")}
						/>
					</ConfirmDialog>
				</RoleGuard>
			</PageHeader>
			<p className="mb-4 max-w-3xl text-[13px] leading-5 text-mute">
				{t("organizations.tenantScope")}
			</p>
			<DataTable
				table={table}
				emptyLabel={t("organizations.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>
		</div>
	);
}
