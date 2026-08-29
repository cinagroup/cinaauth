"use client";

import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAdminSession } from "@/hooks/use-admin-session";
import type { OrgDTO } from "@/lib/cinaauth/dto";
import type {
	AdminSubscriptionList,
	AdminSubscriptionView,
	BillingRedirect,
	BillingScope,
} from "@/lib/cinaauth/subscription-contract";
import { isTrustedBillingRedirect } from "@/lib/cinaauth/subscription-contract";
import { fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

type SubscriptionResponse = {
	ok: boolean;
	data?: AdminSubscriptionList;
};

type BillingActionResponse = {
	ok: boolean;
	data?: BillingRedirect;
};

type OrganizationListResponse = {
	ok: boolean;
	data?: OrgDTO[] | { organizations?: OrgDTO[] };
};

export default function BillingPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const [scope, setScope] = useState<BillingScope>("user");
	const [organizationId, setOrganizationId] = useState("");
	const canReadOrganizations = hasAdminControlPermission(
		session?.role,
		"organization.read",
	);
	const {
		data: organizations = [],
		isFetching: isFetchingOrganizations,
		isError: isOrganizationsError,
	} = useQuery({
		queryKey: ["billing-organizations"],
		queryFn: async () => {
			const payload = await fetchAdminJson<OrganizationListResponse>(
				"/api/admin/organizations",
			);
			if (Array.isArray(payload.data)) return payload.data;
			return payload.data?.organizations ?? [];
		},
		enabled: canReadOrganizations,
	});
	const scopeReference =
		scope === "organization"
			? organizationId || null
			: (session?.userId ?? null);
	const canManage = hasAdminControlPermission(
		session?.role,
		"billing.subscription.manage",
	);
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["subscriptions", scope, scopeReference],
		queryFn: async () => {
			const queryParameters = new URLSearchParams({ scope });
			if (scope === "organization") {
				queryParameters.set("organizationId", organizationId);
			}
			const payload = await fetchAdminJson<SubscriptionResponse>(
				`/api/admin/subscriptions?${queryParameters.toString()}`,
			);
			return payload.data;
		},
		enabled: scope === "user" || Boolean(organizationId),
	});
	const subscriptions = data?.subscriptions ?? [];
	const billingUnavailable = data?.available === false;
	const billingAvailable = data?.available === true;
	const returnParameters = new URLSearchParams({ scope });
	if (scope === "organization" && organizationId) {
		returnParameters.set("organizationId", organizationId);
	}

	const openBillingWorkflow = async (
		action: "cancel" | "portal",
		subscriptionId?: string,
	) => {
		try {
			if (scope === "organization" && !organizationId) {
				toast.error(t("toast.actionFailed"));
				return false;
			}
			const payload = await fetchAdminJson<BillingActionResponse>(
				"/api/admin/subscriptions",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action,
						scope,
						returnUrl: `/billing?${returnParameters.toString()}`,
						...(scope === "organization" ? { organizationId } : {}),
						...(subscriptionId ? { subscriptionId } : {}),
					}),
				},
			);
			const redirectUrl = payload.data?.url;
			if (
				!redirectUrl ||
				!isTrustedBillingRedirect(redirectUrl, window.location.href)
			) {
				toast.error(t("toast.actionFailed"));
				return false;
			}
			window.location.assign(redirectUrl);
			return true;
		} catch {
			toast.error(t("toast.actionFailed"));
			return false;
		}
	};

	const columns: ColumnDef<AdminSubscriptionView>[] = [
		{
			accessorKey: "plan",
			header: t("billing.plan"),
		},
		{
			accessorKey: "billingInterval",
			header: t("billing.interval"),
			cell: ({ row }) => row.original.billingInterval ?? "-",
		},
		{
			accessorKey: "status",
			header: t("billing.status"),
			cell: ({ row }) => (
				<Badge
					variant={
						row.original.status === "active" ||
						row.original.status === "trialing"
							? "success"
							: "muted"
					}
				>
					{row.original.cancelAtPeriodEnd
						? t("billing.pendingCancellation")
						: row.original.status}
				</Badge>
			),
		},
		{
			accessorKey: "periodEnd",
			header: t("billing.periodEnd"),
			cell: ({ row }) =>
				row.original.periodEnd
					? new Date(row.original.periodEnd).toLocaleDateString()
					: "-",
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => {
				const subscriptionId = row.original.stripeSubscriptionId;
				if (
					!billingAvailable ||
					!canManage ||
					!subscriptionId ||
					(row.original.status !== "active" &&
						row.original.status !== "trialing")
				) {
					return null;
				}
				return (
					<ConfirmDialog
						trigger={
							<Button variant="ghost" size="sm" className="text-error">
								{t("billing.manageCancellation")}
							</Button>
						}
						title={t("billing.manageCancellation")}
						danger
						confirmText={t("billing.openPortal")}
						onConfirm={() => openBillingWorkflow("cancel", subscriptionId)}
					/>
				);
			},
		},
	];
	const table = useReactTable({
		data: subscriptions,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div>
			<PageHeader
				title={t("billing.title")}
				description={t(`billing.scopeDescription.${scope}`)}
			>
				<Button
					variant={scope === "user" ? "primary" : "secondary"}
					size="sm"
					onClick={() => setScope("user")}
				>
					{t("billing.scope.user")}
				</Button>
				<Button
					variant={scope === "organization" ? "primary" : "secondary"}
					size="sm"
					disabled={
						isFetchingOrganizations ||
						isOrganizationsError ||
						organizations.length === 0
					}
					onClick={() => {
						setScope("organization");
						if (!organizationId && organizations[0]) {
							setOrganizationId(organizations[0].id);
						}
					}}
				>
					{t("billing.scope.organization")}
				</Button>
				{canManage ? (
					<Button
						variant="secondary"
						size="sm"
						disabled={
							!billingAvailable ||
							(scope === "organization" && !organizationId)
						}
						onClick={() => void openBillingWorkflow("portal")}
					>
						{t("billing.portal")}
					</Button>
				) : null}
			</PageHeader>
			{scope === "organization" ? (
				<div className="mb-4 max-w-md rounded-[var(--radius-md)] border border-hairline bg-canvas p-4 shadow-card">
					<Select value={organizationId} onValueChange={setOrganizationId}>
						<SelectTrigger aria-label={t("organizations.title")}>
							<SelectValue placeholder={t("organizations.title")} />
						</SelectTrigger>
						<SelectContent>
							{organizations.map((organization) => (
								<SelectItem key={organization.id} value={organization.id}>
									{organization.name} ({organization.slug})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : null}
			{billingUnavailable ? (
				<EmptyState>
					<p>{t("billing.unavailable")}</p>
				</EmptyState>
			) : (
				<DataTable
					table={table}
					emptyLabel={t("billing.empty")}
					isLoading={isFetching && !data}
					isError={isError}
					onRetry={() => void refetch()}
				/>
			)}
		</div>
	);
}
