"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";
import {
	getCoreRowModel,
	useReactTable,
	type ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { useI18n } from "@/lib/i18n/i18n-context";
import { copyText, fetchAdminJson } from "@/lib/client-api";
import type { ApiKeyDTO } from "@/lib/cinaauth/dto";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export default function ApiKeysPage() {
	const { t } = useI18n();
	const qc = useQueryClient();
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["api-keys"],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok: boolean;
				data?: { apiKeys: ApiKeyDTO[] } | ApiKeyDTO[];
			}>("/api/admin/api-keys");
			if (!d.data) return [];
			return Array.isArray(d.data) ? d.data : (d.data.apiKeys ?? []);
		},
	});

	const keys = data ?? [];
	const [name, setName] = useState("");
	const [scope, setScope] = useState("read-users");
	const [creating, setCreating] = useState(false);
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [editKeyId, setEditKeyId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editExpiresAt, setEditExpiresAt] = useState("");

	const create = async () => {
		if (!name.trim()) {
			toast.error(t("toast.actionFailed"));
			return false;
		}
		setCreating(true);
		try {
			const r = await fetch("/api/admin/api-keys", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name, prefixes: [scope] }),
			});
			const d = (await r.json().catch(() => ({}))) as {
				ok?: boolean;
				data?: { key?: string; apiKeys?: Array<{ key?: string }> };
			};
			const key = d.data?.key ?? d.data?.apiKeys?.[0]?.key;
			if (!r.ok || !d.ok || !key) {
				toast.error(t("toast.createFailed"));
				return false;
			}
			setName("");
			setCreatedKey(key);
			await qc.invalidateQueries({ queryKey: ["api-keys"] });
			return true;
		} finally {
			setCreating(false);
		}
	};

	const toggleKey = async (id: string, enabled: boolean) => {
		const r = await fetch(`/api/admin/api-keys/${id}/toggle`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ enabled }),
		});
		if (!r.ok) toast.error(t("toast.actionFailed"));
		await qc.invalidateQueries({ queryKey: ["api-keys"] });
	};

	const deleteKey = async (id: string) => {
		const r = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
		if (!r.ok) {
			toast.error(t("toast.deleteFailed"));
			return false;
		}
		await qc.invalidateQueries({ queryKey: ["api-keys"] });
		return true;
	};

	const rotateKey = async (id: string) => {
		const r = await fetch(`/api/admin/api-keys/${id}/rotate`, { method: "POST" });
		const d = (await r.json().catch(() => ({}))) as {
			ok?: boolean;
			data?: { key?: string };
		};
		if (d.data?.key) {
			setCreatedKey(d.data.key);
		} else {
			// A rotate that returns no key means the old key may still be live
			// and no replacement was issued — the admin must know it failed.
			toast.error(t("toast.actionFailed"));
		}
		await qc.invalidateQueries({ queryKey: ["api-keys"] });
	};

	const columns = useMemo<ColumnDef<ApiKeyDTO>[]>(
		() => [
			{ accessorKey: "name", header: t("organizations.col.name") },
			{
				accessorKey: "prefix",
				header: t("apiKeys.prefix"),
				cell: ({ row }) => (
					<span className="font-mono text-[12px] leading-4">
						{row.original.prefix}…
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
				accessorKey: "lastUsedAt",
				header: t("apiKeys.lastUsed"),
				cell: ({ row }) =>
					row.original.lastUsedAt
						? new Date(row.original.lastUsedAt).toLocaleDateString()
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
											setEditName(key.name);
											setEditExpiresAt(key.expiresAt ? new Date(key.expiresAt).toISOString().slice(0, 10) : "");
										}}
									>
										{t("common.edit")}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleKey(key.id, !key.enabled)}
									>
										{key.enabled ? t("common.disable") : t("common.enable")}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => rotateKey(key.id)}
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
			<PageHeader title={t("apiKeys.title")}>
				<RoleGuard allow={["super_admin"]}>
					<ConfirmDialog
						trigger={
							<Button variant="primary" size="sm">
								<Plus size={15} />
								{t("apiKeys.create")}
							</Button>
						}
						title={t("apiKeys.create.title")}
						confirmText={creating ? t("common.creating") : t("common.create")}
						onConfirm={create}
					>
						<Input
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={t("apiKeys.name")}
						/>
						<Select value={scope} onValueChange={setScope}>
							<SelectTrigger className="h-10">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="read-users">{t("apiKeys.scope.readUsers")}</SelectItem>
								<SelectItem value="verify-siwe">{t("apiKeys.scope.verifySiwe")}</SelectItem>
							</SelectContent>
						</Select>
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

			{/* Key reveal dialog — shown only once after creation */}
			{createdKey && (
				<Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("apiKeys.created.title")}</DialogTitle>
							<DialogDescription>{t("apiKeys.created.warning")}</DialogDescription>
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
							<Button variant="primary" size="sm" onClick={() => setCreatedKey(null)}>
								{t("apiKeys.created.close")}
							</Button>
						</DialogFooter>
					</DialogContent>
					</Dialog>
				)}

			{/* Edit key dialog */}
			{editKeyId && (
				<Dialog open={!!editKeyId} onOpenChange={(o) => !o && setEditKeyId(null)}>
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
									onChange={(e) => setEditName(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-expires">{t("common.expired")}</Label>
								<Input
									id="edit-expires"
									type="date"
									value={editExpiresAt}
									onChange={(e) => setEditExpiresAt(e.target.value)}
								/>
								<p className="text-[12px] text-mute">{t("apiKeys.edit.expiresHint")}</p>
							</div>
						</div>
						<DialogFooter>
							<Button variant="secondary" size="sm" onClick={() => setEditKeyId(null)}>
								{t("common.cancel")}
							</Button>
							<Button variant="primary" size="sm" onClick={async () => {
								const body: Record<string, unknown> = { name: editName };
								if (editExpiresAt) {
									body.expiresAt = new Date(editExpiresAt).toISOString();
								}
								const r = await fetch(`/api/admin/api-keys/${editKeyId}/edit`, {
									method: "POST",
									headers: { "content-type": "application/json" },
									body: JSON.stringify(body),
								});
								if (r.ok) {
									toast.success(t("toast.saved"));
									setEditKeyId(null);
									await qc.invalidateQueries({ queryKey: ["api-keys"] });
								} else {
									// Keep the dialog open with the entered values for retry.
									toast.error(t("toast.saveFailed"));
								}
							}}>
								{t("common.save")}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
			</div>
		);
	}
