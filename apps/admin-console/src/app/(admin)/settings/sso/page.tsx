"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getCoreRowModel,
	type ColumnDef,
	useReactTable,
} from "@tanstack/react-table";
import { Download, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAdminJson, openExternal } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

interface SsoProvider {
	id: string;
	name: string;
	domain?: string;
	entityId?: string;
	verified?: boolean;
}

interface SsoResponse {
	ok?: boolean;
	data?: {
		providers?: SsoProvider[];
		url?: string;
	};
}

export default function SsoPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [domain, setDomain] = useState("");
	const [entityId, setEntityId] = useState("");
	const [creating, setCreating] = useState(false);
	const [loadingMetadata, setLoadingMetadata] = useState(false);

	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["sso-providers"],
		queryFn: async () => {
			const payload = await fetchAdminJson<SsoResponse>(
				"/api/admin/sso/providers",
			);
			return payload.data?.providers ?? [];
		},
	});
	const providers = data ?? [];

	const create = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!name.trim()) return;
		setCreating(true);
		try {
			await fetchAdminJson<SsoResponse>("/api/admin/sso/providers", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					domain: domain.trim(),
					entityId: entityId.trim(),
				}),
			});
			toast.success(t("common.saved"));
			setName("");
			setDomain("");
			setEntityId("");
			await queryClient.invalidateQueries({ queryKey: ["sso-providers"] });
		} catch {
			toast.error(t("toast.saveFailed"));
		} finally {
			setCreating(false);
		}
	};

	const remove = async (id: string) => {
		try {
			await fetchAdminJson(`/api/admin/sso/providers/${id}`, {
				method: "DELETE",
			});
			await queryClient.invalidateQueries({ queryKey: ["sso-providers"] });
			return true;
		} catch {
			toast.error(t("toast.deleteFailed"));
			return false;
		}
	};

	const verifyDomain = async (provider: SsoProvider) => {
		try {
			await fetchAdminJson("/api/admin/sso/domain-verification", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "verify",
					domain: provider.domain,
					providerId: provider.id,
				}),
			});
			toast.success(t("sso.verified"));
			await queryClient.invalidateQueries({ queryKey: ["sso-providers"] });
		} catch {
			toast.error(t("toast.actionFailed"));
		}
	};

	const downloadMetadata = async () => {
		setLoadingMetadata(true);
		try {
			const payload = await fetchAdminJson<SsoResponse>("/api/admin/sso/metadata");
			if (!payload.data?.url || !openExternal(payload.data.url)) {
				throw new Error("Missing metadata URL");
			}
		} catch {
			toast.error(t("toast.actionFailed"));
		} finally {
			setLoadingMetadata(false);
		}
	};

	const columns: ColumnDef<SsoProvider>[] = [
		{ accessorKey: "name", header: t("sso.providerName") },
		{
			accessorKey: "domain",
			header: t("sso.domain"),
			cell: ({ row }) => row.original.domain ?? "—",
		},
		{
			accessorKey: "entityId",
			header: t("sso.entityId"),
			cell: ({ row }) => row.original.entityId ?? "—",
		},
		{
			header: t("sso.status"),
			cell: ({ row }) =>
				row.original.verified ? (
					<Badge variant="success">{t("sso.verified")}</Badge>
				) : (
					<Badge variant="warning">{t("sso.pending")}</Badge>
				),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex items-center justify-end gap-1">
					{!row.original.verified && row.original.domain && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => verifyDomain(row.original)}
						>
							<ShieldCheck size={15} />
							{t("sso.verifyDomain")}
						</Button>
					)}
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
		data: providers,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="max-w-5xl">
			<PageHeader title={t("sso.title")}>
				<Button
					variant="secondary"
					size="sm"
					disabled={loadingMetadata}
					onClick={downloadMetadata}
				>
					<Download size={15} />
					{t("sso.spMetadata")}
				</Button>
			</PageHeader>

			<form
				onSubmit={create}
				className="mb-4 rounded-[var(--radius-md)] border border-hairline bg-canvas p-4 shadow-card"
			>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<div className="space-y-1.5">
						<Label htmlFor="sso-name">{t("sso.providerName")}</Label>
						<Input
							id="sso-name"
							required
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="sso-domain">{t("sso.domain")}</Label>
						<Input
							id="sso-domain"
							value={domain}
							onChange={(event) => setDomain(event.target.value)}
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
						<Label htmlFor="sso-entity-id">{t("sso.entityId")}</Label>
						<Input
							id="sso-entity-id"
							value={entityId}
							onChange={(event) => setEntityId(event.target.value)}
						/>
					</div>
				</div>
				<Button
					type="submit"
					variant="primary"
					size="sm"
					className="mt-3"
					disabled={creating || !name.trim()}
				>
					<Plus size={15} />
					{t("sso.addProvider")}
				</Button>
			</form>

			<DataTable
				table={table}
				emptyLabel={t("sso.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>
		</div>
	);
}
