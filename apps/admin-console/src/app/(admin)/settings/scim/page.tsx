"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getCoreRowModel,
	type ColumnDef,
	useReactTable,
} from "@tanstack/react-table";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { copyText, fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

interface ScimConnection {
	id: string;
	provider?: string;
}

interface ScimResponse {
	ok?: boolean;
	data?: {
		connections?: ScimConnection[];
		token?: string;
	};
}

export default function ScimPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [createdToken, setCreatedToken] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);

	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["scim-tokens"],
		queryFn: async () => {
			const payload = await fetchAdminJson<ScimResponse>(
				"/api/admin/scim/tokens",
			);
			return payload.data?.connections ?? [];
		},
	});
	const connections = data ?? [];

	const generate = async () => {
		setGenerating(true);
		try {
			const payload = await fetchAdminJson<ScimResponse>(
				"/api/admin/scim/tokens",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({}),
				},
			);
			if (!payload.data?.token) throw new Error("Missing SCIM token");
			setCreatedToken(payload.data.token);
			await queryClient.invalidateQueries({ queryKey: ["scim-tokens"] });
		} catch {
			toast.error(t("toast.actionFailed"));
		} finally {
			setGenerating(false);
		}
	};

	const remove = async (id: string) => {
		try {
			await fetchAdminJson(`/api/admin/scim/tokens/${id}`, { method: "DELETE" });
			await queryClient.invalidateQueries({ queryKey: ["scim-tokens"] });
			return true;
		} catch {
			toast.error(t("toast.deleteFailed"));
			return false;
		}
	};

	const columns: ColumnDef<ScimConnection>[] = [
		{
			accessorKey: "provider",
			header: t("scim.provider"),
			cell: ({ row }) => row.original.provider ?? "—",
		},
		{
			accessorKey: "id",
			header: "ID",
			cell: ({ row }) => (
				<span className="font-mono text-[12px]">{row.original.id.slice(0, 16)}…</span>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex justify-end">
					<ConfirmDialog
						trigger={
							<Button variant="ghost" size="sm" className="text-error">
								<Trash2 size={15} />
								{t("common.delete")}
							</Button>
						}
						title={t("common.delete")}
						danger
						confirmText={t("common.delete")}
						onConfirm={() => remove(row.original.id)}
					/>
				</div>
			),
		},
	];
	const table = useReactTable({
		data: connections,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="max-w-5xl">
			<PageHeader title={t("scim.title")}>
				<Button
					variant="primary"
					size="sm"
					disabled={generating}
					onClick={generate}
				>
					<Plus size={15} />
					{t("scim.generateToken")}
				</Button>
			</PageHeader>
			<DataTable
				table={table}
				emptyLabel={t("scim.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>

			<Dialog
				open={createdToken != null}
				onOpenChange={(open) => !open && setCreatedToken(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("scim.tokenCreated")}</DialogTitle>
						<DialogDescription>{t("scim.tokenWarning")}</DialogDescription>
					</DialogHeader>
					<div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft p-3">
						<code className="min-w-0 flex-1 break-all font-mono text-[13px] text-ink">
							{createdToken}
						</code>
						<Button
							variant="secondary"
							size="sm"
							onClick={async () => {
								if (createdToken && (await copyText(createdToken))) {
									toast.success(t("scim.tokenCopied"));
								} else {
									toast.error(t("toast.actionFailed"));
								}
							}}
						>
							<Copy size={15} />
							{t("common.copy")}
						</Button>
					</div>
					<DialogFooter>
						<Button size="sm" onClick={() => setCreatedToken(null)}>
							{t("common.close")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
