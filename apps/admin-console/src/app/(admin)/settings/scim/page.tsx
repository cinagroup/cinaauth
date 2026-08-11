"use client";

import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAdminSession } from "@/hooks/use-admin-session";
import type { OrgDTO } from "@/lib/cinaauth/dto";
import { copyText, fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { AdminScimProvider } from "@/lib/integration-contract";

interface ScimListResponse {
	ok?: boolean;
	data?: { providers?: AdminScimProvider[] };
}

interface ScimGenerateResponse {
	ok?: boolean;
	data?: { scimToken?: string };
}

interface OrganizationListResponse {
	data?: OrgDTO[] | { organizations?: OrgDTO[] };
}

export default function ScimPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const queryClient = useQueryClient();
	const canManage = hasAdminControlPermission(
		session?.role,
		"integration.scim.manage",
	);
	const [providerId, setProviderId] = useState("");
	const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
	const [createdToken, setCreatedToken] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);

	const { data: organizationData, isFetching: isFetchingOrganizations } =
		useQuery({
			queryKey: ["organizations", "scim-tenant-selector"],
			queryFn: async () => {
				const payload = await fetchAdminJson<OrganizationListResponse>(
					"/api/admin/organizations",
				);
				return Array.isArray(payload.data)
					? payload.data
					: (payload.data?.organizations ?? []);
			},
		});
	const organizations = organizationData ?? [];

	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["scim-providers", selectedOrganizationId],
		queryFn: async () => {
			const query = new URLSearchParams({
				organizationId: selectedOrganizationId,
			});
			const payload = await fetchAdminJson<ScimListResponse>(
				`/api/admin/scim/tokens?${query.toString()}`,
			);
			return payload.data?.providers ?? [];
		},
		enabled: Boolean(selectedOrganizationId),
	});
	const providers = data ?? [];

	const generate = async (event: React.FormEvent) => {
		event.preventDefault();
		setGenerating(true);
		try {
			const payload = await fetchAdminJson<ScimGenerateResponse>(
				"/api/admin/scim/tokens",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						providerId: providerId.trim(),
						organizationId: selectedOrganizationId,
					}),
				},
			);
			const scimToken = payload.data?.scimToken;
			if (!scimToken) throw new Error("Missing SCIM token");
			setCreatedToken(scimToken);
			setProviderId("");
			await queryClient.invalidateQueries({ queryKey: ["scim-providers"] });
		} catch {
			toast.error(t("toast.actionFailed"));
		} finally {
			setGenerating(false);
		}
	};

	const remove = async (provider: AdminScimProvider) => {
		try {
			const query = new URLSearchParams({
				organizationId: provider.organizationId ?? "",
			});
			await fetchAdminJson(
				`/api/admin/scim/tokens/${provider.providerId}?${query.toString()}`,
				{ method: "DELETE" },
			);
			await queryClient.invalidateQueries({ queryKey: ["scim-providers"] });
			return true;
		} catch {
			toast.error(t("toast.deleteFailed"));
			return false;
		}
	};

	const columns: ColumnDef<AdminScimProvider>[] = [
		{
			accessorKey: "providerId",
			header: t("scim.providerId"),
			cell: ({ row }) => (
				<span className="font-mono text-[12px]">{row.original.providerId}</span>
			),
		},
		{
			accessorKey: "organizationId",
			header: t("scim.organizationId"),
			cell: ({ row }) =>
				row.original.organizationId ? (
					<span className="font-mono text-[12px]">
						{row.original.organizationId}
					</span>
				) : (
					t("scim.personalScope")
				),
		},
		{
			accessorKey: "id",
			header: t("scim.connectionId"),
			cell: ({ row }) => (
				<span className="font-mono text-[12px]">
					{row.original.id.slice(0, 16)}...
				</span>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				canManage ? (
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
							onConfirm={() => remove(row.original)}
						/>
					</div>
				) : null,
		},
	];
	const table = useReactTable({
		data: providers,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="max-w-5xl">
			<PageHeader title={t("scim.title")} description={t("scim.tenantScope")} />
			<div className="mb-4 rounded-[var(--radius-md)] border border-hairline bg-canvas p-4 shadow-card">
				<Label htmlFor="scim-tenant-selector">{t("scim.selectedTenant")}</Label>
				<Select
					value={selectedOrganizationId}
					onValueChange={setSelectedOrganizationId}
				>
					<SelectTrigger id="scim-tenant-selector" className="mt-2 max-w-xl">
						<SelectValue placeholder={t("scim.selectTenantPlaceholder")} />
					</SelectTrigger>
					<SelectContent>
						{organizations.map((organization) => (
							<SelectItem key={organization.id} value={organization.id}>
								{organization.name} ({organization.id})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{!isFetchingOrganizations && organizations.length === 0 && (
					<p className="mt-2 text-[12px] text-mute">{t("scim.noTenant")}</p>
				)}
			</div>

			{canManage ? (
				<form
					onSubmit={generate}
					className="mb-4 rounded-[var(--radius-md)] border border-hairline bg-canvas p-4 shadow-card"
				>
					<h2 className="text-[15px] font-semibold text-ink">
						{t("scim.generateHeading")}
					</h2>
					<p className="mt-1 text-[12px] text-body">{t("scim.generateHint")}</p>
					<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="scim-provider-id">{t("scim.providerId")}</Label>
							<Input
								id="scim-provider-id"
								required
								value={providerId}
								onChange={(event) => setProviderId(event.target.value)}
								placeholder="acme-scim"
							/>
						</div>
					</div>
					<Button
						type="submit"
						variant="primary"
						size="sm"
						className="mt-3"
						disabled={
							generating || !providerId.trim() || !selectedOrganizationId
						}
					>
						<Plus size={15} />
						{t("scim.generateToken")}
					</Button>
				</form>
			) : (
				<div className="mb-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 text-[13px] text-body">
					{t("scim.readOnly")}
				</div>
			)}

			<DataTable
				table={table}
				emptyLabel={
					selectedOrganizationId
						? t("scim.empty")
						: t("scim.selectTenantPlaceholder")
				}
				isLoading={Boolean(selectedOrganizationId) && isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>

			<Dialog
				open={createdToken !== null}
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
