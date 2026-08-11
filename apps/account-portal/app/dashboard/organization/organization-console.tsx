"use client";

import type {
	EntitlementFeature,
	EntitlementLimit,
	EntitlementSnapshot,
} from "@cinaauth/auth-web-contract";
import {
	AlertTriangle,
	ArrowLeft,
	Building2,
	CalendarDays,
	Copy,
	Loader2,
	LogOut,
	MailPlus,
	Plus,
	ShieldCheck,
	Trash2,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import { InviteMemberForm } from "@/components/forms/invite-member-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useInvitationCancelMutation } from "@/data/organization/invitation-cancel-mutation";
import { useMemberRemoveMutation } from "@/data/organization/member-remove-mutation";
import { useOrganizationActiveMutation } from "@/data/organization/organization-active-mutation";
import type { OrganizationAuditPage } from "@/data/organization/organization-audit";
import { useOrganizationLeaveMutation } from "@/data/organization/organization-leave-mutation";
import type {
	OrganizationDynamicRoleSummary,
	OrganizationTeamSummary,
} from "@/lib/advanced-organization-console";
import { hasOrganizationPermission } from "@/lib/advanced-organization-console";
import type { SCIMProviderConnection, SSOProviderSummary } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import type {
	OrganizationDetail,
	OrganizationMember,
	OrganizationSummary,
} from "@/lib/organization-console";
import {
	canLeaveOrganization,
	canManageOrganizationMember,
	formatOrganizationDate,
	getOrganizationInvitationUrl,
	getOrganizationPermissions,
	getOrganizationRoleLabel,
	parseOrganizationRoles,
} from "@/lib/organization-console";
import { isSessionRecent } from "@/lib/security-center";
import {
	AdvancedMemberRoleEditor,
	AdvancedOrganizationCard,
} from "./advanced-organization-card";
import { EnterpriseConnectionsCard } from "./enterprise-connections-card";
import { OrganizationAuditCard } from "./organization-audit-card";

type OrganizationConsoleProps = {
	currentUser: {
		id: string;
		name: string;
		email: string;
		image: string | null;
	};
	currentSessionCreatedAt: string;
	initialOrganizations: OrganizationSummary[];
	initialOrganization: OrganizationDetail | null;
	initialTeams: OrganizationTeamSummary[];
	initialDynamicRoles: OrganizationDynamicRoleSummary[];
	initialEntitlements: EntitlementSnapshot | null;
	entitlementsUnavailable: boolean;
	advancedOrganizationDataUnavailable: {
		teams: boolean;
		roles: boolean;
	};
	initialAuditPage: OrganizationAuditPage;
	auditUnavailable: boolean;
	initialSSOProviders: SSOProviderSummary[];
	initialSCIMProviders: SCIMProviderConnection[];
	enterpriseDataUnavailable: {
		sso: boolean;
		scim: boolean;
	};
	dataUnavailable: {
		organizations: boolean;
		organization: boolean;
	};
};

export function OrganizationConsole({
	currentUser,
	currentSessionCreatedAt,
	initialOrganizations,
	initialOrganization,
	initialTeams,
	initialDynamicRoles,
	initialEntitlements,
	entitlementsUnavailable,
	advancedOrganizationDataUnavailable,
	initialAuditPage,
	auditUnavailable,
	initialSSOProviders,
	initialSCIMProviders,
	enterpriseDataUnavailable,
	dataUnavailable,
}: OrganizationConsoleProps) {
	const router = useRouter();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
	const [reauthenticating, setReauthenticating] = useState(false);
	const setActiveMutation = useOrganizationActiveMutation();
	const removeMemberMutation = useMemberRemoveMutation();
	const cancelInvitationMutation = useInvitationCancelMutation();
	const leaveOrganizationMutation = useOrganizationLeaveMutation();

	const recentAuthentication = isSessionRecent(currentSessionCreatedAt);
	const entitlementFeatureLabels = {
		sso: "Enterprise SSO",
		scim: "SCIM provisioning",
		organizationAudit: "Organization audit",
		teams: "Teams",
		dynamicRoles: "Dynamic roles",
		oauthClients: "OAuth clients",
		apiKeys: "API keys",
	} satisfies Record<EntitlementFeature, string>;
	const entitlementLimitLabels = {
		organizationMembers: "Organization members",
		teams: "Teams",
		teamMembers: "Members per team",
		dynamicRoles: "Dynamic roles",
		oauthClients: "OAuth clients",
		apiKeys: "API keys",
		auditRetentionDays: "Audit retention (days)",
	} satisfies Record<EntitlementLimit, string>;
	const currentMember = initialOrganization?.members.find(
		(member) => member.userId === currentUser.id,
	);
	const permissions = getOrganizationPermissions(currentMember?.role ?? "");
	const actorRole = currentMember?.role ?? "";
	const hasEffectivePermission = (
		resource: "member" | "invitation" | "team" | "ac",
		action: string,
	) =>
		hasOrganizationPermission({
			role: actorRole,
			dynamicRoles: initialDynamicRoles,
			resource,
			action,
		});
	const canUpdateMembers =
		permissions.canManageMembers || hasEffectivePermission("member", "update");
	const canDeleteMembers =
		permissions.canManageMembers || hasEffectivePermission("member", "delete");
	const canInviteMembers =
		permissions.canManageInvitations ||
		hasEffectivePermission("invitation", "create");
	const canCancelInvitations =
		permissions.canManageInvitations ||
		hasEffectivePermission("invitation", "cancel");
	const teamPermissions = {
		create: hasEffectivePermission("team", "create"),
		update: hasEffectivePermission("team", "update"),
		delete: hasEffectivePermission("team", "delete"),
	};
	const rolePermissions = {
		create: hasEffectivePermission("ac", "create"),
		update: hasEffectivePermission("ac", "update"),
		delete: hasEffectivePermission("ac", "delete"),
	};
	const pendingInvitations =
		initialOrganization?.invitations.filter(
			(invitation) => invitation.status === "pending",
		) ?? [];
	const ownerCount =
		initialOrganization?.members.filter((member) =>
			parseOrganizationRoles(member.role).includes("owner"),
		).length ?? 0;
	const canLeaveActiveOrganization = currentMember
		? canLeaveOrganization(currentMember.role, ownerCount)
		: false;
	const onlyOwnerCannotLeave = Boolean(
		currentMember &&
			parseOrganizationRoles(currentMember.role).includes("owner") &&
			ownerCount <= 1,
	);
	const authoritativeOrganizationData =
		!dataUnavailable.organizations && !dataUnavailable.organization;

	const switchOrganization = (organizationId: string) => {
		const nextId = organizationId === "personal" ? null : organizationId;
		if (nextId === (initialOrganization?.id ?? null)) return;
		setActiveMutation.mutate(
			{ organizationId: nextId },
			{ onSuccess: () => router.refresh() },
		);
	};

	const reauthenticate = async () => {
		setReauthenticating(true);
		try {
			await authClient.signOut();
			router.push("/sign-in?callbackURL=/dashboard/organization");
		} catch {
			setReauthenticating(false);
			toast.error("Unable to start a fresh sign-in");
		}
	};

	const removeMember = (member: OrganizationMember) => {
		removeMemberMutation.mutate(
			{ memberIdOrEmail: member.id },
			{ onSuccess: () => router.refresh() },
		);
	};

	const cancelInvitation = (invitationId: string) => {
		cancelInvitationMutation.mutate(
			{ invitationId },
			{ onSuccess: () => router.refresh() },
		);
	};

	const leaveActiveOrganization = () => {
		if (!initialOrganization) return;
		leaveOrganizationMutation.mutate(
			{ organizationId: initialOrganization.id },
			{ onSuccess: () => router.refresh() },
		);
	};

	const copyInvitationLink = async (invitationId: string) => {
		const invitationURL = getOrganizationInvitationUrl(
			window.location.origin,
			invitationId,
		);
		if (!invitationURL) {
			toast.error("Unable to build a safe invitation link");
			return;
		}
		try {
			await navigator.clipboard.writeText(invitationURL);
			toast.success("Invitation link copied");
		} catch {
			toast.error("Copy failed. Copy the invitation from its email instead.");
		}
	};

	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
						<Link href="/dashboard">
							<ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
						</Link>
					</Button>
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-primary/10 p-2">
							<Building2 className="h-6 w-6 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">
								Organization Console
							</h1>
							<p className="text-sm text-muted-foreground">
								Manage membership, roles, and pending invitations.
							</p>
						</div>
					</div>
				</div>
				<div className="flex w-full gap-2 sm:w-auto">
					<Select
						value={initialOrganization?.id ?? "personal"}
						onValueChange={switchOrganization}
						disabled={
							dataUnavailable.organizations || setActiveMutation.isPending
						}
					>
						<SelectTrigger
							className="min-w-48"
							aria-label="Active organization"
						>
							<SelectValue placeholder="Select an organization" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="personal">Personal workspace</SelectItem>
							{initialOrganizations.map((organization) => (
								<SelectItem key={organization.id} value={organization.id}>
									{organization.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
						<DialogTrigger asChild>
							<Button
								disabled={
									!recentAuthentication || dataUnavailable.organizations
								}
							>
								<Plus className="mr-2 h-4 w-4" /> New
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create organization</DialogTitle>
								<DialogDescription>
									Create an isolated workspace for a team or product.
								</DialogDescription>
							</DialogHeader>
							<CreateOrganizationForm
								onSuccess={() => {
									setCreateDialogOpen(false);
									router.refresh();
								}}
							/>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{(!recentAuthentication || !authoritativeOrganizationData) && (
				<Alert className="mb-6">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>
						{recentAuthentication
							? "Organization data is temporarily unavailable"
							: "Recent authentication required"}
					</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span>
							{recentAuthentication
								? "Role and invitation controls stay disabled until authoritative organization data can be loaded."
								: "Sign in again before changing organization membership, roles, or invitations."}
						</span>
						{!recentAuthentication && (
							<Button
								size="sm"
								variant="outline"
								onClick={reauthenticate}
								disabled={reauthenticating}
							>
								{reauthenticating && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Sign in again
							</Button>
						)}
					</AlertDescription>
				</Alert>
			)}

			{initialOrganization ? (
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardHeader className="pb-2">
								<CardDescription>Active workspace</CardDescription>
								<CardTitle className="flex items-center gap-2 text-lg">
									<Avatar className="h-8 w-8">
										<AvatarImage src={initialOrganization.logo || undefined} />
										<AvatarFallback>
											{initialOrganization.name.charAt(0)}
										</AvatarFallback>
									</Avatar>
									{initialOrganization.name}
								</CardTitle>
							</CardHeader>
							<CardContent className="text-sm text-muted-foreground">
								/{initialOrganization.slug}
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardDescription>Members</CardDescription>
								<CardTitle className="flex items-center gap-2 text-2xl">
									<Users className="h-5 w-5 text-muted-foreground" />
									{initialOrganization.members.length}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardDescription>Pending invitations</CardDescription>
								<CardTitle className="flex items-center gap-2 text-2xl">
									<MailPlus className="h-5 w-5 text-muted-foreground" />
									{pendingInvitations.length}
								</CardTitle>
							</CardHeader>
						</Card>
					</div>

					<Card>
						<CardHeader className="flex flex-row items-start justify-between gap-4">
							<div>
								<CardTitle>Plan and entitlements</CardTitle>
								<CardDescription>
									This authoritative policy is enforced again by the Auth
									Worker for protected operations.
								</CardDescription>
							</div>
							{initialEntitlements ? (
								<Badge variant="secondary">
									{initialEntitlements.plan.id}
								</Badge>
							) : null}
						</CardHeader>
						<CardContent className="space-y-5">
							{entitlementsUnavailable || !initialEntitlements ? (
								<Alert>
									<AlertTriangle className="h-4 w-4" />
									<AlertTitle>Plan policy is temporarily unavailable</AlertTitle>
									<AlertDescription>
										Protected operations remain fail-closed until the current
										policy can be loaded.
									</AlertDescription>
								</Alert>
							) : (
								<>
									<div>
										<p className="mb-2 text-sm font-medium">Features</p>
										<div className="flex flex-wrap gap-2">
											{Object.entries(initialEntitlements.features).map(
												([feature, enabled]) => (
													<Badge
														key={feature}
														variant={enabled ? "secondary" : "outline"}
													>
														{
															entitlementFeatureLabels[
																feature as EntitlementFeature
															]
														} {enabled ? "enabled" : "unavailable"}
													</Badge>
												),
											)}
										</div>
									</div>
									<div>
										<p className="mb-2 text-sm font-medium">Limits</p>
										<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
											{Object.entries(initialEntitlements.limits).map(
												([limit, value]) => (
													<div
														key={limit}
														className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
													>
														<span className="text-muted-foreground">
															{
																entitlementLimitLabels[
																	limit as EntitlementLimit
																]
															}
														</span>
														<span className="font-medium">
															{value === null ? "Unlimited" : value}
														</span>
													</div>
												),
											)}
										</div>
									</div>
								</>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between gap-4">
							<div>
								<CardTitle>Members</CardTitle>
								<CardDescription>
									Role changes are checked again by the CinaSeek organization
									policy.
								</CardDescription>
							</div>
							<Badge variant="secondary">
								{getOrganizationRoleLabel(currentMember?.role ?? "member")}
							</Badge>
						</CardHeader>
						<CardContent className="space-y-3">
							{initialOrganization.members.map((member) => {
								const isCurrentUser = member.userId === currentUser.id;
								const staticCanManageTarget = canManageOrganizationMember(
									currentMember?.role ?? "",
									member.role,
								);
								const targetIsOwner = parseOrganizationRoles(
									member.role,
								).includes("owner");
								const canUpdateTarget =
									staticCanManageTarget || (canUpdateMembers && !targetIsOwner);
								const canDeleteTarget =
									staticCanManageTarget || (canDeleteMembers && !targetIsOwner);
								const updateMutationDisabled =
									!recentAuthentication ||
									!authoritativeOrganizationData ||
									!canUpdateTarget;
								const deleteMutationDisabled =
									!recentAuthentication ||
									!authoritativeOrganizationData ||
									!canDeleteTarget;

								return (
									<div
										key={member.id}
										className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="flex min-w-0 items-center gap-3">
											<Avatar>
												<AvatarImage src={member.user.image || undefined} />
												<AvatarFallback>
													{member.user.name.charAt(0)}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0">
												<p className="truncate text-sm font-medium">
													{member.user.name} {isCurrentUser && "(you)"}
												</p>
												<p className="truncate text-xs text-muted-foreground">
													{member.user.email}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="outline">
												{getOrganizationRoleLabel(member.role)}
											</Badge>
											<AdvancedMemberRoleEditor
												member={member}
												actorRole={currentMember?.role ?? ""}
												dynamicRoles={initialDynamicRoles}
												ownerCount={ownerCount}
												actorCanManage={canUpdateMembers}
												disabled={
													updateMutationDisabled ||
													advancedOrganizationDataUnavailable.roles
												}
											/>
											{!isCurrentUser && canDeleteTarget && (
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															variant="destructive"
															size="icon"
															disabled={
																deleteMutationDisabled ||
																removeMemberMutation.isPending
															}
															aria-label={`Remove ${member.user.name}`}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Remove {member.user.name}?
															</AlertDialogTitle>
															<AlertDialogDescription>
																They will immediately lose access to this
																organization.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancel</AlertDialogCancel>
															<AlertDialogAction
																onClick={() => removeMember(member)}
															>
																Remove member
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											)}
										</div>
									</div>
								);
							})}
						</CardContent>
					</Card>

					<AdvancedOrganizationCard
						organizationId={initialOrganization.id}
						members={initialOrganization.members}
						initialTeams={initialTeams}
						initialDynamicRoles={initialDynamicRoles}
						teamPermissions={teamPermissions}
						rolePermissions={rolePermissions}
						recentAuthentication={recentAuthentication}
						authoritativeOrganizationData={authoritativeOrganizationData}
						dataUnavailable={advancedOrganizationDataUnavailable}
					/>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between gap-4">
							<div>
								<CardTitle>Invitations</CardTitle>
								<CardDescription>
									Pending links expire automatically and can be revoked at any
									time.
								</CardDescription>
							</div>
							<Dialog
								open={inviteDialogOpen}
								onOpenChange={setInviteDialogOpen}
							>
								<DialogTrigger asChild>
									<Button
										disabled={
											!canInviteMembers ||
											!recentAuthentication ||
											!authoritativeOrganizationData
										}
									>
										<MailPlus className="mr-2 h-4 w-4" /> Invite
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Invite a member</DialogTitle>
										<DialogDescription>
											Send an invitation with a least-privilege starting role.
										</DialogDescription>
									</DialogHeader>
									<InviteMemberForm
										onSuccess={() => {
											setInviteDialogOpen(false);
											router.refresh();
										}}
									/>
								</DialogContent>
							</Dialog>
						</CardHeader>
						<CardContent>
							{pendingInvitations.length > 0 ? (
								<div className="space-y-3">
									{pendingInvitations.map((invitation) => (
										<div
											key={invitation.id}
											className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
										>
											<div>
												<p className="text-sm font-medium">
													{invitation.email}
												</p>
												<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
													<Badge variant="outline">
														{getOrganizationRoleLabel(invitation.role)}
													</Badge>
													<span className="flex items-center gap-1">
														<CalendarDays className="h-3 w-3" /> Expires{" "}
														{formatOrganizationDate(invitation.expiresAt)}
													</span>
												</div>
											</div>
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => copyInvitationLink(invitation.id)}
												>
													<Copy className="mr-2 h-4 w-4" /> Copy link
												</Button>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => cancelInvitation(invitation.id)}
													disabled={
														!canCancelInvitations ||
														!recentAuthentication ||
														!authoritativeOrganizationData ||
														cancelInvitationMutation.isPending
													}
												>
													Revoke
												</Button>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									No active invitations.
								</p>
							)}
						</CardContent>
					</Card>

					{permissions.canManageMembers ? (
						<EnterpriseConnectionsCard
							organizationId={initialOrganization.id}
							recentAuthentication={recentAuthentication}
							authoritativeOrganizationData={authoritativeOrganizationData}
							initialSSOProviders={initialSSOProviders}
							initialSCIMProviders={initialSCIMProviders}
							dataUnavailable={enterpriseDataUnavailable}
						/>
					) : null}

					{permissions.canManageMembers ? (
						<OrganizationAuditCard
							key={initialOrganization.id}
							organizationId={initialOrganization.id}
							organizationName={initialOrganization.name}
							currentUserId={currentUser.id}
							initialPage={initialAuditPage}
							initiallyUnavailable={auditUnavailable}
						/>
					) : null}

					<Card className="border-destructive/40">
						<CardHeader>
							<CardTitle>Leave organization</CardTitle>
							<CardDescription>
								Remove your own membership from this organization.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{onlyOwnerCannotLeave ? (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertTitle>Transfer ownership before leaving</AlertTitle>
									<AlertDescription>
										An organization must retain at least one owner. Promote
										another member before removing your membership.
									</AlertDescription>
								</Alert>
							) : (
								<p className="text-sm text-muted-foreground">
									You will immediately lose access to shared resources and must
									be reinvited to return.
								</p>
							)}
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="destructive"
										disabled={
											!recentAuthentication ||
											!authoritativeOrganizationData ||
											!canLeaveActiveOrganization ||
											leaveOrganizationMutation.isPending
										}
									>
										{leaveOrganizationMutation.isPending ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<LogOut className="mr-2 h-4 w-4" />
										)}
										Leave {initialOrganization.name}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Leave {initialOrganization.name}?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This removes your membership immediately and cannot be
											undone without a new invitation.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Keep membership</AlertDialogCancel>
										<AlertDialogAction
											onClick={leaveActiveOrganization}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Leave organization
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</CardContent>
					</Card>
				</div>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShieldCheck className="h-5 w-5" /> Personal workspace
						</CardTitle>
						<CardDescription>
							Select an existing organization or create one to manage shared
							access.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex items-center gap-3">
						<Avatar>
							<AvatarImage src={currentUser.image || undefined} />
							<AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<div>
							<p className="text-sm font-medium">{currentUser.name}</p>
							<p className="text-xs text-muted-foreground">
								{currentUser.email}
							</p>
						</div>
					</CardContent>
				</Card>
			)}
		</main>
	);
}
