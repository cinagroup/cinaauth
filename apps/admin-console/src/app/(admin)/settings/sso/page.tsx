"use client";

import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Copy, Download, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAdminSession } from "@/hooks/use-admin-session";
import type { OrgDTO } from "@/lib/cinaauth/dto";
import { copyText, fetchAdminJson, openExternal } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type {
	AdminSsoProvider,
	DnsVerificationRecord,
} from "@/lib/integration-contract";
import { buildDnsVerificationRecords } from "@/lib/integration-contract";

interface SsoListResponse {
	ok?: boolean;
	data?: { providers?: AdminSsoProvider[] };
}

interface OrganizationListResponse {
	data?: OrgDTO[] | { organizations?: OrgDTO[] };
}

interface SsoCreateResponse {
	ok?: boolean;
	data?: AdminSsoProvider & { domainVerificationToken?: string };
}

interface DomainVerificationResponse {
	ok?: boolean;
	data?: { domainVerificationToken?: string };
}

interface MetadataResponse {
	ok?: boolean;
	data?: { url?: string };
}

interface VerificationSetup {
	provider: Pick<AdminSsoProvider, "providerId" | "domain">;
	token: string;
	records: DnsVerificationRecord[];
}

const initialForm = {
	providerId: "",
	domain: "",
	issuer: "",
	clientId: "",
	clientSecret: "",
	discoveryEndpoint: "",
};

export default function SsoPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const queryClient = useQueryClient();
	const canManage = hasAdminControlPermission(
		session?.role,
		"integration.sso.manage",
	);
	const [form, setForm] = useState(initialForm);
	const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
	const [creating, setCreating] = useState(false);
	const [requestingVerification, setRequestingVerification] = useState<
		string | null
	>(null);
	const [verifying, setVerifying] = useState(false);
	const [loadingMetadata, setLoadingMetadata] = useState<string | null>(null);
	const [verificationSetup, setVerificationSetup] =
		useState<VerificationSetup | null>(null);

	const { data: organizationData, isFetching: isFetchingOrganizations } =
		useQuery({
			queryKey: ["organizations", "sso-tenant-selector"],
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
		queryKey: ["sso-providers", selectedOrganizationId],
		queryFn: async () => {
			const query = new URLSearchParams({
				organizationId: selectedOrganizationId,
			});
			const payload = await fetchAdminJson<SsoListResponse>(
				`/api/admin/sso/providers?${query.toString()}`,
			);
			return payload.data?.providers ?? [];
		},
		enabled: Boolean(selectedOrganizationId),
	});
	const providers = data ?? [];

	const updateField = (field: keyof typeof initialForm, value: string) => {
		setForm((current) => ({ ...current, [field]: value }));
	};

	const openVerificationSetup = (
		provider: Pick<AdminSsoProvider, "providerId" | "domain">,
		token: string,
	) => {
		const records = buildDnsVerificationRecords(
			provider.providerId,
			provider.domain,
			token,
		);
		if (records.length === 0) throw new Error("Invalid provider domain");
		setVerificationSetup({ provider, token, records });
	};

	const create = async (event: React.FormEvent) => {
		event.preventDefault();
		setCreating(true);
		try {
			const payload = await fetchAdminJson<SsoCreateResponse>(
				"/api/admin/sso/providers",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						providerId: form.providerId.trim(),
						organizationId: selectedOrganizationId,
						domain: form.domain.trim(),
						issuer: form.issuer.trim(),
						oidcConfig: {
							clientId: form.clientId.trim(),
							clientSecret: form.clientSecret,
							discoveryEndpoint: form.discoveryEndpoint.trim(),
							pkce: true,
							scopes: ["openid", "email", "profile"],
						},
					}),
				},
			);
			const provider = payload.data;
			if (!provider?.providerId) throw new Error("Missing SSO provider");
			toast.success(t("common.saved"));
			setForm(initialForm);
			if (provider.domainVerificationToken) {
				openVerificationSetup(provider, provider.domainVerificationToken);
			}
			await queryClient.invalidateQueries({ queryKey: ["sso-providers"] });
		} catch {
			toast.error(t("toast.saveFailed"));
		} finally {
			setCreating(false);
		}
	};

	const remove = async (provider: AdminSsoProvider) => {
		try {
			const query = new URLSearchParams({
				organizationId: provider.organizationId ?? "",
			});
			await fetchAdminJson(
				`/api/admin/sso/providers/${provider.providerId}?${query.toString()}`,
				{ method: "DELETE" },
			);
			await queryClient.invalidateQueries({ queryKey: ["sso-providers"] });
			return true;
		} catch {
			toast.error(t("toast.deleteFailed"));
			return false;
		}
	};

	const requestVerification = async (provider: AdminSsoProvider) => {
		setRequestingVerification(provider.providerId);
		try {
			const payload = await fetchAdminJson<DomainVerificationResponse>(
				"/api/admin/sso/domain-verification",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action: "request",
						providerId: provider.providerId,
						organizationId: provider.organizationId,
					}),
				},
			);
			const token = payload.data?.domainVerificationToken;
			if (!token) throw new Error("Missing domain verification token");
			openVerificationSetup(provider, token);
		} catch {
			toast.error(t("toast.actionFailed"));
		} finally {
			setRequestingVerification(null);
		}
	};

	const verifyDomain = async () => {
		if (!verificationSetup) return;
		setVerifying(true);
		try {
			await fetchAdminJson("/api/admin/sso/domain-verification", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "verify",
					providerId: verificationSetup.provider.providerId,
					organizationId: selectedOrganizationId,
				}),
			});
			toast.success(t("sso.verified"));
			setVerificationSetup(null);
			await queryClient.invalidateQueries({ queryKey: ["sso-providers"] });
		} catch {
			toast.error(t("sso.verificationFailed"));
		} finally {
			setVerifying(false);
		}
	};

	const downloadMetadata = async (provider: AdminSsoProvider) => {
		setLoadingMetadata(provider.providerId);
		try {
			const query = new URLSearchParams({
				providerId: provider.providerId,
				organizationId: provider.organizationId ?? "",
			});
			const payload = await fetchAdminJson<MetadataResponse>(
				`/api/admin/sso/metadata?${query.toString()}`,
			);
			if (!payload.data?.url || !openExternal(payload.data.url)) {
				throw new Error("Missing metadata URL");
			}
		} catch {
			toast.error(t("toast.actionFailed"));
		} finally {
			setLoadingMetadata(null);
		}
	};

	const columns: ColumnDef<AdminSsoProvider>[] = [
		{
			accessorKey: "providerId",
			header: t("sso.providerId"),
			cell: ({ row }) => (
				<span className="font-mono text-[12px]">{row.original.providerId}</span>
			),
		},
		{
			accessorKey: "issuer",
			header: t("sso.issuer"),
			cell: ({ row }) => (
				<span className="break-all text-[12px]">{row.original.issuer}</span>
			),
		},
		{
			accessorKey: "domain",
			header: t("sso.domain"),
		},
		{
			accessorKey: "type",
			header: t("sso.type"),
			cell: ({ row }) => row.original.type.toUpperCase(),
		},
		{
			header: t("sso.status"),
			cell: ({ row }) =>
				row.original.domainVerified ? (
					<Badge variant="success">{t("sso.verified")}</Badge>
				) : (
					<Badge variant="warning">{t("sso.pending")}</Badge>
				),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				canManage ? (
					<div className="flex flex-wrap items-center justify-end gap-1">
						{row.original.type === "saml" && (
							<Button
								variant="ghost"
								size="sm"
								disabled={loadingMetadata === row.original.providerId}
								onClick={() => downloadMetadata(row.original)}
							>
								<Download size={15} />
								{t("sso.spMetadata")}
							</Button>
						)}
						{!row.original.domainVerified && (
							<Button
								variant="ghost"
								size="sm"
								disabled={requestingVerification === row.original.providerId}
								onClick={() => requestVerification(row.original)}
							>
								<ShieldCheck size={15} />
								{t("sso.requestVerification")}
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
		<div className="max-w-6xl">
			<PageHeader title={t("sso.title")} description={t("sso.tenantScope")} />
			<div className="mb-4 rounded-[var(--radius-md)] border border-hairline bg-canvas p-4 shadow-card">
				<Label htmlFor="sso-tenant-selector">{t("sso.selectedTenant")}</Label>
				<Select
					value={selectedOrganizationId}
					onValueChange={(value) => {
						setSelectedOrganizationId(value);
						setVerificationSetup(null);
					}}
				>
					<SelectTrigger id="sso-tenant-selector" className="mt-2 max-w-xl">
						<SelectValue placeholder={t("sso.selectTenantPlaceholder")} />
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
					<p className="mt-2 text-[12px] text-mute">{t("sso.noTenant")}</p>
				)}
			</div>

			{canManage ? (
				<form
					onSubmit={create}
					className="mb-4 rounded-[var(--radius-md)] border border-hairline bg-canvas p-4 shadow-card"
				>
					<div className="mb-3">
						<h2 className="text-[15px] font-semibold text-ink">
							{t("sso.oidcRegistration")}
						</h2>
						<p className="mt-1 text-[12px] text-body">
							{t("sso.oidcRegistrationHint")}
						</p>
					</div>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						<div className="space-y-1.5">
							<Label htmlFor="sso-provider-id">{t("sso.providerId")}</Label>
							<Input
								id="sso-provider-id"
								required
								value={form.providerId}
								onChange={(event) =>
									updateField("providerId", event.target.value)
								}
								placeholder="acme-oidc"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="sso-domain">{t("sso.domain")}</Label>
							<Input
								id="sso-domain"
								required
								value={form.domain}
								onChange={(event) => updateField("domain", event.target.value)}
								placeholder="acme.example"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="sso-issuer">{t("sso.issuer")}</Label>
							<Input
								id="sso-issuer"
								type="url"
								required
								value={form.issuer}
								onChange={(event) => updateField("issuer", event.target.value)}
								placeholder="https://idp.acme.example"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="sso-client-id">{t("sso.clientId")}</Label>
							<Input
								id="sso-client-id"
								required
								value={form.clientId}
								onChange={(event) =>
									updateField("clientId", event.target.value)
								}
								autoComplete="off"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="sso-client-secret">{t("sso.clientSecret")}</Label>
							<Input
								id="sso-client-secret"
								type="password"
								required
								value={form.clientSecret}
								onChange={(event) =>
									updateField("clientSecret", event.target.value)
								}
								autoComplete="new-password"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="sso-discovery-endpoint">
								{t("sso.discoveryEndpoint")}
							</Label>
							<Input
								id="sso-discovery-endpoint"
								type="url"
								required
								value={form.discoveryEndpoint}
								onChange={(event) =>
									updateField("discoveryEndpoint", event.target.value)
								}
								placeholder="https://idp.acme.example/.well-known/openid-configuration"
							/>
						</div>
					</div>
					<Button
						type="submit"
						variant="primary"
						size="sm"
						className="mt-3"
						disabled={creating || !selectedOrganizationId}
					>
						<Plus size={15} />
						{t("sso.addProvider")}
					</Button>
				</form>
			) : (
				<div className="mb-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 text-[13px] text-body">
					{t("sso.readOnly")}
				</div>
			)}

			<DataTable
				table={table}
				emptyLabel={
					selectedOrganizationId
						? t("sso.empty")
						: t("sso.selectTenantPlaceholder")
				}
				isLoading={Boolean(selectedOrganizationId) && isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>

			<Dialog
				open={verificationSetup !== null}
				onOpenChange={(open) => !open && setVerificationSetup(null)}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t("sso.dnsTitle")}</DialogTitle>
						<DialogDescription>{t("sso.dnsDescription")}</DialogDescription>
					</DialogHeader>
					{verificationSetup && (
						<div className="space-y-3">
							{verificationSetup.records.map((record) => (
								<div
									key={record.domain}
									className="space-y-2 rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft p-3"
								>
									<div className="text-[12px] font-medium text-ink">
										{record.domain}
									</div>
									{[
										[t("sso.dnsHost"), record.host],
										[t("sso.dnsValue"), record.value],
									].map(([label, value]) => (
										<div key={label}>
											<div className="mb-1 text-[11px] text-mute">{label}</div>
											<div className="flex items-start gap-2">
												<code className="min-w-0 flex-1 break-all font-mono text-[12px] text-ink">
													{value}
												</code>
												<Button
													variant="secondary"
													size="sm"
													onClick={async () => {
														if (await copyText(value)) {
															toast.success(t("common.copied"));
														} else {
															toast.error(t("toast.actionFailed"));
														}
													}}
												>
													<Copy size={14} />
													{t("common.copy")}
												</Button>
											</div>
										</div>
									))}
								</div>
							))}
						</div>
					)}
					<DialogFooter>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setVerificationSetup(null)}
						>
							{t("common.close")}
						</Button>
						<Button
							variant="primary"
							size="sm"
							disabled={verifying}
							onClick={verifyDomain}
						>
							<ShieldCheck size={15} />
							{t("sso.verifyDns")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
