"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Copy, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGuard } from "@/components/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiKeyDTO } from "@/lib/cinaauth/dto";
import { copyText, fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

export default function ApiKeysPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["api-keys"],
		queryFn: async () => {
			const response = await fetchAdminJson<{
				ok: boolean;
				data?: { apiKeys: ApiKeyDTO[] } | ApiKeyDTO[];
			}>("/api/admin/api-keys");
			if (!response.data) return [];
			return Array.isArray(response.data)
				? response.data
				: (response.data.apiKeys ?? []);
		},
	});

	const keys = data ?? [];
	const [name, setName] = useState("");
	const [prefix, setPrefix] = useState("");
	const [creating, setCreating] = useState(false);
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [editKeyId, setEditKeyId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editExpiresAt, setEditExpiresAt] = useState("");

	const invalidateKeys = () =>
		queryClient.invalidateQueries({ queryKey: ["api-keys"] });

	const create = async () => {
		if (!name.trim()) {
			toast.error(t("toast.actionFailed"));
			return false;
		}
		setCreating(true);
		try {
			const response = await fetchAdminJson<{
				ok: boolean;
				data?: { key?: string };
			}>("/api/admin/api-keys", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					...(prefix.trim() ? { prefix: prefix.trim() } : {}),
				}),
			});
			const key = response.data?.key;
			if (!key) {
				toast.error(t("toast.createFailed"));
				return false;
			}
			setName("");
			setPrefix("");
			setCreatedKey(key);
			await invalidateKeys();
			return true;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : t("toast.createFailed"),
			);
			return false;
		} finally {
			setCreating(false);
		}
	};

	const toggleKey = async (id: string, enabled: boolean) => {
		try {
			await fetchAdminJson(`/api/admin/api-keys/${id}/toggle`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ enabled }),
			});
			await invalidateKeys();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : t("toast.actionFailed"),
			);
		}
	};

	const deleteKey = async (id: string) => {
		try {
			await fetchAdminJson(`/api/admin/api-keys/${id}`, { method: "DELETE" });
			await invalidateKeys();
			return true;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : t("toast.deleteFailed"),
			);
			return false;
		}
	};

	const rotateKey = async (id: string) => {
		try {
			const response = await fetchAdminJson<{
				ok: boolean;
				data?: { key?: string };
			}>(`/api/admin/api-keys/${id}/rotate`, { method: "POST" });
			if (!response.data?.key) throw new Error(t("toast.actionFailed"));
			setCreatedKey(response.data.key);
			await invalidateKeys();
		} catch (error) {
			// Rotation failures carry explicit residual-state guidance from the BFF.
			toast.error(
				error instanceof Error ? error.message : t("toast.actionFailed"),
			);
		}
	};

	const columns = useMemo<ColumnDef<ApiKeyDTO>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("organizations.col.name"),
				cell: ({ row }) => row.original.name ?? "—",
			},
			{
				accessorKey: "start",
				header: t("apiKeys.prefix"),
				cell: ({ row }) => (
					<span className="font-mono text-[12px] leading-4">
						{row.original.start ??
							(row.original.prefix ? `${row.original.prefix}…` : "—")}
					</span>
				),
			},
			{
				header: t("users.col.status"),
				cell: ({ row }) =>
					row.original.enabled ? (
						<Badge variant="success">{t("common.enabled")}</Badge>
					) : (
						<Badge variant="muted">{t("common.disabled")}</Badge>
					),
			},
			{
				accessorKey: "expiresAt",
				header: t("common.expired"),
				cell: ({ row }) =>
					row.original.expiresAt
						? new Date(row.original.expiresAt).toLocaleDateString()
						: t("common.permanent"),
			},
			{
				accessorKey: "lastRequest",
				header: t("apiKeys.lastUsed"),
				cell: ({ row }) =>
					row.original.lastRequest
						? new Date(row.original.lastRequest).toLocaleDateString()
						: "—",
			},
			{
				accessorKey: "remaining",
				header: t("apiKeys.remaining"),
				cell: ({ row }) =>
					row.original.remaining != null
						? row.original.remaining
						: t("common.permanent"),
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => {
					const key = row.original;
					return (
						<RoleGuard allow={["super_admin"]}>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setEditKeyId(key.id);
										setEditName(key.name ?? "");
										setEditExpiresAt(
											key.expiresAt
												? new Date(key.expiresAt).toISOString().slice(0, 10)
												: "",
										);
									}}
								>
									{t("common.edit")}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => void toggleKey(key.id, !key.enabled)}
								>
									{key.enabled ? t("common.disable") : t("common.enable")}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => void rotateKey(key.id)}
								>
									{t("common.rotate")}
								</Button>
								<ConfirmDialog
									trigger={
										<Button variant="ghost" size="sm" className="text-error">
											{t("common.delete")}
										</Button>
									}
									title={t("apiKeys.delete.title")}
									onConfirm={() => deleteKey(key.id)}
								/>
							</div>
						</RoleGuard>
					);
				},
			},
		],
		[t],
	);

	const table = useReactTable({
		data: keys,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div>
			<PageHeader
				title={t("apiKeys.title")}
				description={t("apiKeys.description")}
			>
				<RoleGuard allow={["super_admin"]}>
					<ConfirmDialog
						trigger={
							<Button variant="primary" size="sm">
								<Plus size={15} />
								{t("apiKeys.create")}
							</Button>
						}
						title={t("apiKeys.create.title")}
						description={t("apiKeys.create.description")}
						confirmText={creating ? t("common.creating") : t("common.create")}
						onConfirm={create}
					>
						<div className="space-y-1.5">
							<Label htmlFor="api-key-name">{t("apiKeys.name")}</Label>
							<Input
								id="api-key-name"
								required
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder={t("apiKeys.name")}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="api-key-prefix">{t("apiKeys.prefix")}</Label>
							<Input
								id="api-key-prefix"
								value={prefix}
								onChange={(event) => setPrefix(event.target.value)}
								placeholder={t("apiKeys.prefix.placeholder")}
							/>
						</div>
					</ConfirmDialog>
				</RoleGuard>
			</PageHeader>
			<DataTable
				table={table}
				emptyLabel={t("apiKeys.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>

			{/* The plaintext credential is shown only in this no-persistence dialog. */}
			{createdKey && (
				<Dialog
					open={!!createdKey}
					onOpenChange={(open) => !open && setCreatedKey(null)}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("apiKeys.created.title")}</DialogTitle>
							<DialogDescription>
								{t("apiKeys.created.warning")}
							</DialogDescription>
						</DialogHeader>
						<div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft p-3">
							<code className="flex-1 break-all font-mono text-[13px] text-ink">
								{createdKey}
							</code>
							<Button
								variant="secondary"
								size="sm"
								onClick={async () => {
									if (await copyText(createdKey)) {
										toast.success(t("apiKeys.created.copied"));
									} else {
										toast.error(t("toast.actionFailed"));
									}
								}}
							>
								<Copy size={15} />
								{t("apiKeys.created.copy")}
							</Button>
						</div>
						<DialogFooter>
							<Button
								variant="primary"
								size="sm"
								onClick={() => setCreatedKey(null)}
							>
								{t("apiKeys.created.close")}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{editKeyId && (
				<Dialog
					open={!!editKeyId}
					onOpenChange={(open) => !open && setEditKeyId(null)}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("apiKeys.edit.title")}</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="edit-name">{t("apiKeys.name")}</Label>
								<Input
									id="edit-name"
									value={editName}
									onChange={(event) => setEditName(event.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-expires">{t("common.expired")}</Label>
								<Input
									id="edit-expires"
									type="date"
									value={editExpiresAt}
									onChange={(event) => setEditExpiresAt(event.target.value)}
								/>
								<p className="text-[12px] text-mute">
									{t("apiKeys.edit.expiresHint")}
								</p>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setEditKeyId(null)}
							>
								{t("common.cancel")}
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={async () => {
									try {
										await fetchAdminJson(
											`/api/admin/api-keys/${editKeyId}/edit`,
											{
												method: "POST",
												headers: { "content-type": "application/json" },
												body: JSON.stringify({
													name: editName,
													expiresAt: editExpiresAt
														? new Date(editExpiresAt).toISOString()
														: null,
												}),
											},
										);
										toast.success(t("toast.saved"));
										setEditKeyId(null);
										await invalidateKeys();
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: t("toast.saveFailed"),
										);
									}
								}}
							>
								{t("common.save")}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
