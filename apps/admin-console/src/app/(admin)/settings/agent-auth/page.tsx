"use client";

import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	Bot,
	Clock3,
	KeyRound,
	RefreshCw,
	ServerCog,
	ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/layout/page-header";
import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminSession } from "@/hooks/use-admin-session";
import type {
	AgentAuthAdminData,
	AgentAuthAgent,
	AgentAuthApproval,
	AgentAuthGrant,
	AgentAuthHost,
} from "@/lib/agent-auth";
import { fetchAdminJson, getAdminApiErrorMessage } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

type AgentAuthResponse = { ok: true; data: AgentAuthAdminData };
type MutationResource = "agents" | "hosts" | "grants" | "approvals";
type MutationAction = "revoke" | "deny";

type ManagementMutation = {
	resource: MutationResource;
	id: string;
	action: MutationAction;
};

const terminalStatuses = new Set([
	"denied",
	"consumed",
	"expired",
	"rejected",
	"revoked",
]);

const statusVariant = (status: string): BadgeProps["variant"] => {
	if (status === "active" || status === "approved") return "success";
	if (status === "pending") return "warning";
	if (terminalStatuses.has(status)) return "danger";
	return "muted";
};

const formatTimestamp = (value: string | null) =>
	value ? new Date(value).toLocaleString() : "—";

const ownerLabel = (
	name: string | null,
	email: string | null,
	userId: string | null,
) => name ?? email ?? userId ?? "—";

function StatusBadge({ status, label }: { status: string; label: string }) {
	return <Badge variant={statusVariant(status)}>{label}</Badge>;
}

function SummaryCard({
	title,
	value,
	description,
	icon: Icon,
}: {
	title: string;
	value: number;
	description: string;
	icon: typeof Bot;
}) {
	return (
		<Card>
			<CardContent className="flex items-start justify-between gap-4 p-5">
				<div>
					<p className="text-[13px] leading-5 text-mute">{title}</p>
					<p className="mt-1 text-[28px] font-semibold leading-8 text-ink">
						{value}
					</p>
					<p className="mt-1 text-[12px] leading-4 text-body">{description}</p>
				</div>
				<Icon size={20} className="text-mute" aria-hidden />
			</CardContent>
		</Card>
	);
}

function ResourceAction({
	label,
	title,
	description,
	confirmationText,
	pending,
	onConfirm,
}: {
	label: string;
	title: string;
	description: string;
	confirmationText?: string;
	pending: boolean;
	onConfirm: () => Promise<unknown>;
}) {
	return (
		<ConfirmDialog
			trigger={
				<Button variant="danger" size="sm" disabled={pending}>
					{label}
				</Button>
			}
			title={title}
			description={description}
			confirmText={label}
			danger
			confirmationText={confirmationText}
			onConfirm={onConfirm}
		/>
	);
}

function AgentsTable({
	agents,
	canManage,
	pending,
	onRevoke,
	t,
}: {
	agents: AgentAuthAgent[];
	canManage: boolean;
	pending: boolean;
	onRevoke: (id: string) => Promise<unknown>;
	t: (key: string) => string;
}) {
	if (agents.length === 0)
		return <EmptyState>{t("agentAuth.emptyAgents")}</EmptyState>;
	return (
		<div className="overflow-x-auto rounded-[var(--radius-lg)] border border-hairline">
			<table className="w-full min-w-[900px] text-left text-[13px]">
				<thead className="bg-canvas-soft text-mute">
					<tr>
						<th className="px-4 py-3 font-medium">{t("agentAuth.name")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.owner")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.host")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.mode")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.status")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.lastUsed")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.grants")}</th>
						{canManage && (
							<th className="px-4 py-3 font-medium">{t("common.actions")}</th>
						)}
					</tr>
				</thead>
				<tbody className="divide-y divide-hairline">
					{agents.map((agent) => (
						<tr key={agent.id}>
							<td className="px-4 py-3">
								<p className="font-medium text-ink">{agent.name}</p>
								<p className="font-mono text-[11px] text-mute">{agent.id}</p>
							</td>
							<td className="px-4 py-3 text-body">
								{ownerLabel(agent.ownerName, agent.ownerEmail, agent.userId)}
							</td>
							<td className="px-4 py-3 text-body">
								{agent.hostName ?? agent.hostId}
							</td>
							<td className="px-4 py-3">
								<Badge variant="outline">{agent.mode}</Badge>
							</td>
							<td className="px-4 py-3">
								<StatusBadge
									status={agent.status}
									label={t(`agentAuth.status.${agent.status}`)}
								/>
							</td>
							<td className="px-4 py-3 text-body">
								{formatTimestamp(agent.lastUsedAt)}
							</td>
							<td className="px-4 py-3 text-body">{agent.grantCount}</td>
							{canManage && (
								<td className="px-4 py-3">
									{!terminalStatuses.has(agent.status) && (
										<ResourceAction
											label={t("agentAuth.revokeAgent")}
											title={t("agentAuth.confirmRevokeAgent")}
											description={t("agentAuth.revokeAgentHint")}
											confirmationText={agent.name}
											pending={pending}
											onConfirm={() => onRevoke(agent.id)}
										/>
									)}
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function HostsTable({
	hosts,
	canManage,
	pending,
	onRevoke,
	t,
}: {
	hosts: AgentAuthHost[];
	canManage: boolean;
	pending: boolean;
	onRevoke: (id: string) => Promise<unknown>;
	t: (key: string) => string;
}) {
	if (hosts.length === 0)
		return <EmptyState>{t("agentAuth.emptyHosts")}</EmptyState>;
	return (
		<div className="overflow-x-auto rounded-[var(--radius-lg)] border border-hairline">
			<table className="w-full min-w-[760px] text-left text-[13px]">
				<thead className="bg-canvas-soft text-mute">
					<tr>
						<th className="px-4 py-3 font-medium">{t("agentAuth.name")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.owner")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.status")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.agents")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.lastUsed")}</th>
						{canManage && (
							<th className="px-4 py-3 font-medium">{t("common.actions")}</th>
						)}
					</tr>
				</thead>
				<tbody className="divide-y divide-hairline">
					{hosts.map((host) => (
						<tr key={host.id}>
							<td className="px-4 py-3">
								<p className="font-medium text-ink">
									{host.name ?? t("agentAuth.unnamedHost")}
								</p>
								<p className="font-mono text-[11px] text-mute">{host.id}</p>
							</td>
							<td className="px-4 py-3 text-body">
								{ownerLabel(host.ownerName, host.ownerEmail, host.userId)}
							</td>
							<td className="px-4 py-3">
								<StatusBadge
									status={host.status}
									label={t(`agentAuth.status.${host.status}`)}
								/>
							</td>
							<td className="px-4 py-3 text-body">{host.agentCount}</td>
							<td className="px-4 py-3 text-body">
								{formatTimestamp(host.lastUsedAt)}
							</td>
							{canManage && (
								<td className="px-4 py-3">
									{!terminalStatuses.has(host.status) && (
										<ResourceAction
											label={t("agentAuth.revokeHost")}
											title={t("agentAuth.confirmRevokeHost")}
											description={t("agentAuth.revokeHostHint")}
											confirmationText={host.name ?? host.id}
											pending={pending}
											onConfirm={() => onRevoke(host.id)}
										/>
									)}
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function GrantsTable({
	grants,
	canManage,
	pending,
	onRevoke,
	t,
}: {
	grants: AgentAuthGrant[];
	canManage: boolean;
	pending: boolean;
	onRevoke: (id: string) => Promise<unknown>;
	t: (key: string) => string;
}) {
	if (grants.length === 0)
		return <EmptyState>{t("agentAuth.emptyGrants")}</EmptyState>;
	return (
		<div className="overflow-x-auto rounded-[var(--radius-lg)] border border-hairline">
			<table className="w-full min-w-[760px] text-left text-[13px]">
				<thead className="bg-canvas-soft text-mute">
					<tr>
						<th className="px-4 py-3 font-medium">{t("agentAuth.agent")}</th>
						<th className="px-4 py-3 font-medium">
							{t("agentAuth.capability")}
						</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.status")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.expires")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.created")}</th>
						{canManage && (
							<th className="px-4 py-3 font-medium">{t("common.actions")}</th>
						)}
					</tr>
				</thead>
				<tbody className="divide-y divide-hairline">
					{grants.map((grant) => (
						<tr key={grant.id}>
							<td className="px-4 py-3">
								<p className="font-medium text-ink">
									{grant.agentName ?? grant.agentId}
								</p>
								<p className="font-mono text-[11px] text-mute">{grant.id}</p>
							</td>
							<td className="px-4 py-3">
								<Badge variant="outline">{grant.capability}</Badge>
							</td>
							<td className="px-4 py-3">
								<StatusBadge
									status={grant.status}
									label={t(`agentAuth.status.${grant.status}`)}
								/>
							</td>
							<td className="px-4 py-3 text-body">
								{formatTimestamp(grant.expiresAt)}
							</td>
							<td className="px-4 py-3 text-body">
								{formatTimestamp(grant.createdAt)}
							</td>
							{canManage && (
								<td className="px-4 py-3">
									{!terminalStatuses.has(grant.status) && (
										<ResourceAction
											label={t("agentAuth.revokeGrant")}
											title={t("agentAuth.confirmRevokeGrant")}
											description={t("agentAuth.revokeGrantHint")}
											pending={pending}
											onConfirm={() => onRevoke(grant.id)}
										/>
									)}
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function ApprovalsTable({
	approvals,
	canManage,
	pending,
	onDeny,
	t,
}: {
	approvals: AgentAuthApproval[];
	canManage: boolean;
	pending: boolean;
	onDeny: (id: string) => Promise<unknown>;
	t: (key: string) => string;
}) {
	if (approvals.length === 0)
		return <EmptyState>{t("agentAuth.emptyApprovals")}</EmptyState>;
	return (
		<div className="overflow-x-auto rounded-[var(--radius-lg)] border border-hairline">
			<table className="w-full min-w-[900px] text-left text-[13px]">
				<thead className="bg-canvas-soft text-mute">
					<tr>
						<th className="px-4 py-3 font-medium">{t("agentAuth.agent")}</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.owner")}</th>
						<th className="px-4 py-3 font-medium">
							{t("agentAuth.approvalMethod")}
						</th>
						<th className="px-4 py-3 font-medium">
							{t("agentAuth.capabilities")}
						</th>
						<th className="px-4 py-3 font-medium">{t("agentAuth.expires")}</th>
						{canManage && (
							<th className="px-4 py-3 font-medium">{t("common.actions")}</th>
						)}
					</tr>
				</thead>
				<tbody className="divide-y divide-hairline">
					{approvals.map((approval) => (
						<tr key={approval.id}>
							<td className="px-4 py-3">
								<p className="font-medium text-ink">
									{approval.agentName ?? approval.agentId ?? "—"}
								</p>
								<p className="font-mono text-[11px] text-mute">{approval.id}</p>
							</td>
							<td className="px-4 py-3 text-body">
								{ownerLabel(
									approval.ownerName,
									approval.ownerEmail,
									approval.userId,
								)}
							</td>
							<td className="px-4 py-3">
								<Badge variant="outline">{approval.method}</Badge>
							</td>
							<td className="px-4 py-3">
								<div className="flex max-w-sm flex-wrap gap-1">
									{approval.capabilities.map((capability) => (
										<Badge key={capability}>{capability}</Badge>
									))}
								</div>
							</td>
							<td className="px-4 py-3 text-body">
								{formatTimestamp(approval.expiresAt)}
							</td>
							{canManage && (
								<td className="px-4 py-3">
									<ResourceAction
										label={t("agentAuth.denyApproval")}
										title={t("agentAuth.confirmDenyApproval")}
										description={t("agentAuth.denyApprovalHint")}
										pending={pending}
										onConfirm={() => onDeny(approval.id)}
									/>
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default function AgentAuthManagementPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const queryClient = useQueryClient();
	const canManage = hasAdminControlPermission(
		session?.role,
		"integration.agent-auth.manage",
	);
	const inventoryQuery = useQuery({
		queryKey: ["agent-auth-admin"],
		queryFn: async () =>
			(await fetchAdminJson<AgentAuthResponse>("/api/admin/agent-auth")).data,
		refetchOnWindowFocus: false,
	});
	const mutation = useMutation({
		mutationFn: ({ resource, id, action }: ManagementMutation) =>
			fetchAdminJson(
				`/api/admin/agent-auth/${resource}/${encodeURIComponent(id)}/${action}`,
				{
					method: "POST",
				},
			),
		onSuccess: async () => {
			toast.success(t("agentAuth.actionSucceeded"));
			await queryClient.invalidateQueries({ queryKey: ["agent-auth-admin"] });
		},
		onError: (error) =>
			toast.error(getAdminApiErrorMessage(error, t("agentAuth.actionFailed"))),
	});
	const run = (
		resource: MutationResource,
		id: string,
		action: MutationAction,
	) => mutation.mutateAsync({ resource, id, action });

	if (inventoryQuery.isLoading) {
		return (
			<div className="max-w-7xl space-y-4">
				<PageHeader title={t("agentAuth.title")} />
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-32 rounded-[var(--radius-lg)]" />
					))}
				</div>
				<Skeleton className="h-80 rounded-[var(--radius-lg)]" />
			</div>
		);
	}
	if (inventoryQuery.isError || !inventoryQuery.data) {
		return (
			<div className="max-w-5xl">
				<PageHeader title={t("agentAuth.title")} />
				<EmptyState>
					<AlertCircle size={20} className="text-error" aria-hidden />
					<span>{t("agentAuth.loadFailed")}</span>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => void inventoryQuery.refetch()}
					>
						<RefreshCw size={15} />
						{t("error.retry")}
					</Button>
				</EmptyState>
			</div>
		);
	}

	const data = inventoryQuery.data;
	return (
		<div className="max-w-7xl">
			<PageHeader
				title={t("agentAuth.title")}
				description={t("agentAuth.description")}
			>
				<Button
					variant="secondary"
					size="sm"
					onClick={() => void inventoryQuery.refetch()}
					disabled={inventoryQuery.isFetching}
				>
					<RefreshCw
						size={15}
						className={inventoryQuery.isFetching ? "animate-spin" : undefined}
					/>
					{t("agentAuth.refresh")}
				</Button>
			</PageHeader>
			{!canManage && (
				<div className="mb-5 flex gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] leading-5 text-warning">
					<ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
					<span>{t("agentAuth.readOnly")}</span>
				</div>
			)}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title={t("agentAuth.agents")}
					value={data.summary.agentCount}
					description={`${data.summary.activeAgentCount} ${t("agentAuth.active")}`}
					icon={Bot}
				/>
				<SummaryCard
					title={t("agentAuth.hosts")}
					value={data.summary.hostCount}
					description={`${data.summary.activeHostCount} ${t("agentAuth.active")}`}
					icon={ServerCog}
				/>
				<SummaryCard
					title={t("agentAuth.grants")}
					value={data.summary.grantCount}
					description={t("agentAuth.authorizedCapabilities")}
					icon={KeyRound}
				/>
				<SummaryCard
					title={t("agentAuth.pendingApprovals")}
					value={data.summary.pendingApprovalCount}
					description={t("agentAuth.awaitingDecision")}
					icon={Clock3}
				/>
			</div>

			<Card className="mt-5">
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<CardTitle>{t("agentAuth.policy")}</CardTitle>
							<CardDescription>
								{data.policy.providerName} · {data.policy.providerDescription}
							</CardDescription>
						</div>
						<Badge variant={data.policy.enabled ? "success" : "danger"}>
							{data.policy.enabled
								? t("agentAuth.enabled")
								: t("agentAuth.disabled")}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
					<div>
						<p className="text-[12px] text-mute">{t("agentAuth.modes")}</p>
						<div className="mt-2 flex flex-wrap gap-1">
							{data.policy.modes.map((mode) => (
								<Badge key={mode} variant="outline">
									{mode}
								</Badge>
							))}
						</div>
					</div>
					<div>
						<p className="text-[12px] text-mute">
							{t("agentAuth.approvalMethods")}
						</p>
						<div className="mt-2 flex flex-wrap gap-1">
							{data.policy.approvalMethods.map((method) => (
								<Badge key={method} variant="outline">
									{method}
								</Badge>
							))}
						</div>
					</div>
					<div>
						<p className="text-[12px] text-mute">
							{t("agentAuth.sessionPolicy")}
						</p>
						<p className="mt-2 text-[13px] text-body">
							{t("agentAuth.sessionTtl")}: {data.policy.agentSessionTTL}s
						</p>
						<p className="text-[13px] text-body">
							{t("agentAuth.maxLifetime")}: {data.policy.agentMaxLifetime}s
						</p>
					</div>
					<div>
						<p className="text-[12px] text-mute">
							{t("agentAuth.registrationPolicy")}
						</p>
						<p className="mt-2 text-[13px] text-body">
							{t("agentAuth.dynamicHosts")}:{" "}
							{data.policy.allowDynamicHostRegistration
								? t("agentAuth.allowed")
								: t("agentAuth.blocked")}
						</p>
						<p className="text-[13px] text-body">
							{t("agentAuth.maxAgentsPerUser")}: {data.policy.maxAgentsPerUser}
						</p>
					</div>
					<div className="md:col-span-2 xl:col-span-4">
						<p className="text-[12px] text-mute">
							{t("agentAuth.capabilities")}
						</p>
						<div className="mt-2 grid gap-2 md:grid-cols-2">
							{data.policy.capabilities.map((capability) => (
								<div
									key={capability.name}
									className="rounded-[var(--radius-sm)] border border-hairline px-3 py-2"
								>
									<div className="flex items-center justify-between gap-2">
										<span className="font-mono text-[12px] text-ink">
											{capability.name}
										</span>
										{capability.approvalStrength && (
											<Badge variant="warning">
												{capability.approvalStrength}
											</Badge>
										)}
									</div>
									<p className="mt-1 text-[12px] leading-4 text-body">
										{capability.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			<Tabs defaultValue="agents" className="mt-6">
				<TabsList>
					<TabsTrigger value="agents">
						{t("agentAuth.agents")} ({data.agents.length})
					</TabsTrigger>
					<TabsTrigger value="hosts">
						{t("agentAuth.hosts")} ({data.hosts.length})
					</TabsTrigger>
					<TabsTrigger value="grants">
						{t("agentAuth.grants")} ({data.grants.length})
					</TabsTrigger>
					<TabsTrigger value="approvals">
						{t("agentAuth.approvals")} ({data.approvals.length})
					</TabsTrigger>
				</TabsList>
				<TabsContent value="agents">
					<AgentsTable
						agents={data.agents}
						canManage={canManage}
						pending={mutation.isPending}
						onRevoke={(id) => run("agents", id, "revoke")}
						t={t}
					/>
				</TabsContent>
				<TabsContent value="hosts">
					<HostsTable
						hosts={data.hosts}
						canManage={canManage}
						pending={mutation.isPending}
						onRevoke={(id) => run("hosts", id, "revoke")}
						t={t}
					/>
				</TabsContent>
				<TabsContent value="grants">
					<GrantsTable
						grants={data.grants}
						canManage={canManage}
						pending={mutation.isPending}
						onRevoke={(id) => run("grants", id, "revoke")}
						t={t}
					/>
				</TabsContent>
				<TabsContent value="approvals">
					<ApprovalsTable
						approvals={data.approvals}
						canManage={canManage}
						pending={mutation.isPending}
						onDeny={(id) => run("approvals", id, "deny")}
						t={t}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
