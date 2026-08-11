"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	FolderKanban,
	Loader2,
	Pencil,
	Plus,
	ShieldCheck,
	Trash2,
	UserPlus,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import {
	addOrganizationTeamMember,
	createOrganizationRole,
	createOrganizationTeam,
	deleteOrganizationRole,
	deleteOrganizationTeam,
	listOrganizationTeamMembers,
	removeOrganizationTeamMember,
	updateOrganizationRole,
	updateOrganizationTeam,
} from "@/data/organization/advanced-organization-mutations";
import { useMemberRoleUpdateMutation } from "@/data/organization/member-role-update-mutation";
import type {
	DynamicRoleDraft,
	OrganizationDynamicRoleSummary,
	OrganizationTeamSummary,
} from "@/lib/advanced-organization-console";
import {
	createEmptyDynamicRoleDraft,
	getDynamicRoleDraftError,
	getMemberRoleSelectionError,
	getTeamNameError,
	ORGANIZATION_PERMISSION_RESOURCES,
	ORGANIZATION_PERMISSION_STATEMENT,
	toggleRolePermission,
	toRolePermissionPayload,
} from "@/lib/advanced-organization-console";
import type { OrganizationMember } from "@/lib/organization-console";
import {
	getOrganizationRoleLabel,
	parseOrganizationRoles,
} from "@/lib/organization-console";

type AdvancedOrganizationCardProps = {
	organizationId: string;
	members: OrganizationMember[];
	initialTeams: OrganizationTeamSummary[];
	initialDynamicRoles: OrganizationDynamicRoleSummary[];
	teamPermissions: {
		create: boolean;
		update: boolean;
		delete: boolean;
	};
	rolePermissions: {
		create: boolean;
		update: boolean;
		delete: boolean;
	};
	recentAuthentication: boolean;
	authoritativeOrganizationData: boolean;
	dataUnavailable: {
		teams: boolean;
		roles: boolean;
	};
};

const mutationError = (error: unknown, fallback: string) =>
	error instanceof Error && error.message ? error.message : fallback;

const RoleEditorDialog = ({
	organizationId,
	roles,
	role,
	disabled,
	onSaved,
}: {
	organizationId: string;
	roles: OrganizationDynamicRoleSummary[];
	role?: OrganizationDynamicRoleSummary;
	disabled: boolean;
	onSaved: () => void;
}) => {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<DynamicRoleDraft>(() =>
		role
			? {
					role: role.role,
					permission: toRolePermissionPayload(role.permission),
				}
			: createEmptyDynamicRoleDraft(),
	);
	const mutation = useMutation({
		mutationFn: async () => {
			const error = getDynamicRoleDraftError({
				draft,
				roles,
				editingRole: role?.role,
			});
			if (error) throw new Error(error);
			const permission = toRolePermissionPayload(draft.permission);
			if (role) {
				await updateOrganizationRole({
					organizationId,
					roleName: role.role,
					nextRoleName: role.role,
					permission,
				});
				return;
			}
			await createOrganizationRole({
				organizationId,
				role: draft.role,
				permission,
			});
		},
		onSuccess: () => {
			toast.success(role ? "Role updated" : "Role created");
			setOpen(false);
			onSaved();
		},
		onError: (error) =>
			toast.error(mutationError(error, "Unable to save the role")),
	});

	const onOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (nextOpen) {
			setDraft(
				role
					? {
							role: role.role,
							permission: toRolePermissionPayload(role.permission),
						}
					: createEmptyDynamicRoleDraft(),
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant={role ? "outline" : "default"}
					size={role ? "icon" : "sm"}
					disabled={disabled}
					aria-label={role ? `Edit ${role.role}` : undefined}
				>
					{role ? (
						<Pencil className="h-4 w-4" />
					) : (
						<>
							<Plus className="mr-2 h-4 w-4" /> New role
						</>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{role ? "Edit role" : "Create role"}</DialogTitle>
					<DialogDescription>
						Permissions are organization-scoped and checked again by the Auth
						Worker.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor={`role-name-${role?.id ?? "new"}`}>Role name</Label>
						<Input
							id={`role-name-${role?.id ?? "new"}`}
							value={draft.role}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									role: event.target.value,
								}))
							}
							placeholder="support_agent"
							disabled={mutation.isPending || Boolean(role)}
						/>
						<p className="text-xs text-muted-foreground">
							Use a stable lowercase identifier. Existing role names are
							immutable so member assignments cannot become stale.
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						{ORGANIZATION_PERMISSION_RESOURCES.map((resource) => (
							<div key={resource} className="rounded-lg border p-3">
								<p className="mb-3 text-sm font-medium capitalize">
									{resource}
								</p>
								<div className="space-y-2">
									{ORGANIZATION_PERMISSION_STATEMENT[resource].map((action) => {
										const id = `${role?.id ?? "new"}-${resource}-${action}`;
										return (
											<div key={action} className="flex items-center gap-2">
												<Checkbox
													id={id}
													checked={Boolean(
														draft.permission[resource]?.includes(action),
													)}
													onCheckedChange={(checked) =>
														setDraft((current) =>
															toggleRolePermission(
																current,
																resource,
																action,
																checked === true,
															),
														)
													}
													disabled={mutation.isPending}
												/>
												<Label htmlFor={id} className="font-normal capitalize">
													{action}
												</Label>
											</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={() => mutation.mutate()}
						disabled={mutation.isPending}
					>
						{mutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{role ? "Save role" : "Create role"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const TeamEditorDialog = ({
	organizationId,
	team,
	disabled,
	onSaved,
}: {
	organizationId: string;
	team?: OrganizationTeamSummary;
	disabled: boolean;
	onSaved: () => void;
}) => {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(team?.name ?? "");
	const mutation = useMutation({
		mutationFn: async () => {
			const error = getTeamNameError(name);
			if (error) throw new Error(error);
			if (team) {
				await updateOrganizationTeam({ teamId: team.id, name });
				return;
			}
			await createOrganizationTeam({ organizationId, name });
		},
		onSuccess: () => {
			toast.success(team ? "Team renamed" : "Team created");
			setOpen(false);
			onSaved();
		},
		onError: (error) =>
			toast.error(mutationError(error, "Unable to save the team")),
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) setName(team?.name ?? "");
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant={team ? "outline" : "default"}
					size={team ? "icon" : "sm"}
					disabled={disabled}
					aria-label={team ? `Rename ${team.name}` : undefined}
				>
					{team ? (
						<Pencil className="h-4 w-4" />
					) : (
						<>
							<Plus className="mr-2 h-4 w-4" /> New team
						</>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{team ? "Rename team" : "Create team"}</DialogTitle>
					<DialogDescription>
						Teams group existing organization members without changing their
						organization roles.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor={`team-name-${team?.id ?? "new"}`}>Team name</Label>
					<Input
						id={`team-name-${team?.id ?? "new"}`}
						value={name}
						onChange={(event) => setName(event.target.value)}
						disabled={mutation.isPending}
						placeholder="Platform"
					/>
				</div>
				<DialogFooter>
					<Button
						onClick={() => mutation.mutate()}
						disabled={mutation.isPending}
					>
						{mutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{team ? "Save name" : "Create team"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const TeamMembershipDialog = ({
	organizationId,
	team,
	members,
	disabled,
}: {
	organizationId: string;
	team: OrganizationTeamSummary;
	members: OrganizationMember[];
	disabled: boolean;
}) => {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState("");
	const queryKey = ["organization", organizationId, "team", team.id, "members"];
	const membershipQuery = useQuery({
		queryKey,
		queryFn: () => listOrganizationTeamMembers(team.id),
		enabled: open,
	});
	const membershipMutation = useMutation({
		mutationFn: ({
			action,
			userId,
		}: {
			action: "add" | "remove";
			userId: string;
		}) =>
			action === "add"
				? addOrganizationTeamMember({ organizationId, teamId: team.id, userId })
				: removeOrganizationTeamMember({
						organizationId,
						teamId: team.id,
						userId,
					}),
		onSuccess: async () => {
			setSelectedUserId("");
			await queryClient.invalidateQueries({ queryKey });
			toast.success("Team membership updated");
		},
		onError: (error) =>
			toast.error(mutationError(error, "Unable to update team membership")),
	});
	const membershipUserIds = new Set(
		(membershipQuery.data ?? []).map((membership) => membership.userId),
	);
	const eligibleMembers = members.filter(
		(member) => !membershipUserIds.has(member.userId),
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Users className="mr-2 h-4 w-4" /> Members
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{team.name} members</DialogTitle>
					<DialogDescription>
						Only existing members of this organization can be added.
					</DialogDescription>
				</DialogHeader>
				{membershipQuery.isPending ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading members
					</div>
				) : membershipQuery.isError ? (
					<Alert variant="destructive">
						<AlertTitle>Team membership unavailable</AlertTitle>
						<AlertDescription>
							No membership changes are allowed until the authoritative list
							loads.
						</AlertDescription>
					</Alert>
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							{(membershipQuery.data ?? []).length > 0 ? (
								(membershipQuery.data ?? []).map((membership) => {
									const member = members.find(
										(candidate) => candidate.userId === membership.userId,
									);
									return (
										<div
											key={membership.id}
											className="flex items-center justify-between rounded-lg border p-3"
										>
											<div>
												<p className="text-sm font-medium">
													{member?.user.name ?? "Unknown member"}
												</p>
												<p className="text-xs text-muted-foreground">
													{member?.user.email ?? membership.userId}
												</p>
											</div>
											<Button
												variant="ghost"
												size="sm"
												disabled={disabled || membershipMutation.isPending}
												onClick={() =>
													membershipMutation.mutate({
														action: "remove",
														userId: membership.userId,
													})
												}
											>
												Remove
											</Button>
										</div>
									);
								})
							) : (
								<p className="text-sm text-muted-foreground">
									No members in this team.
								</p>
							)}
						</div>
						{eligibleMembers.length > 0 && (
							<div className="flex gap-2">
								<Select
									value={selectedUserId}
									onValueChange={setSelectedUserId}
									disabled={disabled || membershipMutation.isPending}
								>
									<SelectTrigger aria-label={`Add member to ${team.name}`}>
										<SelectValue placeholder="Select organization member" />
									</SelectTrigger>
									<SelectContent>
										{eligibleMembers.map((member) => (
											<SelectItem key={member.id} value={member.userId}>
												{member.user.name} · {member.user.email}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									disabled={
										disabled || !selectedUserId || membershipMutation.isPending
									}
									onClick={() =>
										membershipMutation.mutate({
											action: "add",
											userId: selectedUserId,
										})
									}
								>
									<UserPlus className="h-4 w-4" />
								</Button>
							</div>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export const AdvancedMemberRoleEditor = ({
	member,
	actorRole,
	dynamicRoles,
	ownerCount,
	actorCanManage,
	disabled,
}: {
	member: OrganizationMember;
	actorRole: string;
	dynamicRoles: OrganizationDynamicRoleSummary[];
	ownerCount: number;
	actorCanManage: boolean;
	disabled: boolean;
}) => {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [selectedRoles, setSelectedRoles] = useState<string[]>(() =>
		parseOrganizationRoles(member.role),
	);
	const updateMutation = useMemberRoleUpdateMutation();
	const availableRoles = [
		"owner",
		"admin",
		"member",
		...dynamicRoles.map((role) => role.role),
	];
	const staleRoles = selectedRoles.filter(
		(role) => !availableRoles.includes(role),
	);
	const actorIsOwner = parseOrganizationRoles(actorRole).includes("owner");
	const targetIsFinalOwner =
		parseOrganizationRoles(member.role).includes("owner") && ownerCount <= 1;

	const submit = () => {
		const error = getMemberRoleSelectionError({
			actorRole,
			targetRole: member.role,
			selectedRoles,
			availableRoles,
			ownerCount,
			actorCanManage,
		});
		if (error) {
			toast.error(error);
			return;
		}
		updateMutation.mutate(
			{ memberId: member.id, role: selectedRoles },
			{
				onSuccess: () => {
					setOpen(false);
					router.refresh();
				},
			},
		);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) setSelectedRoles(parseOrganizationRoles(member.role));
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" disabled={disabled}>
					Manage roles
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Roles for {member.user.name}</DialogTitle>
					<DialogDescription>
						A member can hold multiple static or organization-defined roles.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					{availableRoles.map((role) => {
						const checked = selectedRoles.includes(role);
						const ownerLocked =
							role === "owner" &&
							(!actorIsOwner || (targetIsFinalOwner && checked));
						const id = `${member.id}-role-${role}`;
						return (
							<div
								key={role}
								className="flex items-center gap-2 rounded-lg border p-3"
							>
								<Checkbox
									id={id}
									checked={checked}
									disabled={ownerLocked || updateMutation.isPending}
									onCheckedChange={(nextChecked) =>
										setSelectedRoles((current) =>
											nextChecked === true
												? [...new Set([...current, role])]
												: current.filter((candidate) => candidate !== role),
										)
									}
								/>
								<Label htmlFor={id} className="font-normal">
									{getOrganizationRoleLabel(role)}
								</Label>
							</div>
						);
					})}
					{staleRoles.length > 0 && (
						<Alert variant="destructive">
							<AlertTitle>Unavailable role definitions</AlertTitle>
							<AlertDescription>
								Remove these stale assignments before saving:{" "}
								{staleRoles.join(", ")}
							</AlertDescription>
						</Alert>
					)}
				</div>
				<DialogFooter>
					<Button onClick={submit} disabled={updateMutation.isPending}>
						{updateMutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Save roles
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export const AdvancedOrganizationCard = ({
	organizationId,
	members,
	initialTeams,
	initialDynamicRoles,
	teamPermissions,
	rolePermissions,
	recentAuthentication,
	authoritativeOrganizationData,
	dataUnavailable,
}: AdvancedOrganizationCardProps) => {
	const router = useRouter();
	const mutationContextUnavailable =
		!recentAuthentication || !authoritativeOrganizationData;
	const deleteTeamMutation = useMutation({
		mutationFn: (teamId: string) =>
			deleteOrganizationTeam({ organizationId, teamId }),
		onSuccess: () => {
			toast.success("Team deleted");
			router.refresh();
		},
		onError: (error) =>
			toast.error(mutationError(error, "Unable to delete the team")),
	});
	const deleteRoleMutation = useMutation({
		mutationFn: (roleName: string) =>
			deleteOrganizationRole({ organizationId, roleName }),
		onSuccess: () => {
			toast.success("Role deleted");
			router.refresh();
		},
		onError: (error) =>
			toast.error(mutationError(error, "Unable to delete the role")),
	});

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2">
							<FolderKanban className="h-5 w-5" /> Teams
						</CardTitle>
						<CardDescription>
							Up to 50 teams and 100 organization members per team.
						</CardDescription>
					</div>
					<TeamEditorDialog
						organizationId={organizationId}
						disabled={
							!teamPermissions.create ||
							mutationContextUnavailable ||
							dataUnavailable.teams
						}
						onSaved={() => router.refresh()}
					/>
				</CardHeader>
				<CardContent className="space-y-3">
					{dataUnavailable.teams ? (
						<Alert variant="destructive">
							<AlertTitle>Teams unavailable</AlertTitle>
							<AlertDescription>
								Team controls remain disabled until authoritative data loads.
							</AlertDescription>
						</Alert>
					) : initialTeams.length > 0 ? (
						initialTeams.map((team) => (
							<div
								key={team.id}
								className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<p className="text-sm font-medium">{team.name}</p>
									<p className="text-xs text-muted-foreground">
										Team ID {team.id.slice(-8)}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<TeamMembershipDialog
										organizationId={organizationId}
										team={team}
										members={members}
										disabled={
											!teamPermissions.update || mutationContextUnavailable
										}
									/>
									{(teamPermissions.update || teamPermissions.delete) && (
										<>
											{teamPermissions.update && (
												<TeamEditorDialog
													organizationId={organizationId}
													team={team}
													disabled={mutationContextUnavailable}
													onSaved={() => router.refresh()}
												/>
											)}
											{teamPermissions.delete && (
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															variant="destructive"
															size="icon"
															disabled={
																mutationContextUnavailable ||
																deleteTeamMutation.isPending
															}
															aria-label={`Delete ${team.name}`}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Delete {team.name}?
															</AlertDialogTitle>
															<AlertDialogDescription>
																Memberships in this team will be removed. The
																final team cannot be deleted.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancel</AlertDialogCancel>
															<AlertDialogAction
																onClick={() =>
																	deleteTeamMutation.mutate(team.id)
																}
															>
																Delete team
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											)}
										</>
									)}
								</div>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">
							No teams yet. Create the first team to group members.
						</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2">
							<ShieldCheck className="h-5 w-5" /> Custom roles
						</CardTitle>
						<CardDescription>
							Up to 25 organization-scoped role definitions.
						</CardDescription>
					</div>
					<RoleEditorDialog
						organizationId={organizationId}
						roles={initialDynamicRoles}
						disabled={
							!rolePermissions.create ||
							mutationContextUnavailable ||
							dataUnavailable.roles
						}
						onSaved={() => router.refresh()}
					/>
				</CardHeader>
				<CardContent className="space-y-3">
					{dataUnavailable.roles ? (
						<Alert variant="destructive">
							<AlertTitle>Role definitions unavailable</AlertTitle>
							<AlertDescription>
								Role controls remain disabled until authoritative data loads.
							</AlertDescription>
						</Alert>
					) : initialDynamicRoles.length > 0 ? (
						initialDynamicRoles.map((role) => (
							<div key={role.id} className="rounded-lg border p-4">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-medium">
											{getOrganizationRoleLabel(role.role)}
										</p>
										<p className="text-xs text-muted-foreground">{role.role}</p>
									</div>
									{(rolePermissions.update || rolePermissions.delete) && (
										<div className="flex gap-2">
											{rolePermissions.update && (
												<RoleEditorDialog
													organizationId={organizationId}
													roles={initialDynamicRoles}
													role={role}
													disabled={mutationContextUnavailable}
													onSaved={() => router.refresh()}
												/>
											)}
											{rolePermissions.delete && (
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															variant="destructive"
															size="icon"
															disabled={
																mutationContextUnavailable ||
																deleteRoleMutation.isPending
															}
															aria-label={`Delete ${role.role}`}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Delete {role.role}?
															</AlertDialogTitle>
															<AlertDialogDescription>
																Remove this role from members before deleting
																its definition.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancel</AlertDialogCancel>
															<AlertDialogAction
																onClick={() =>
																	deleteRoleMutation.mutate(role.role)
																}
															>
																Delete role
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											)}
										</div>
									)}
								</div>
								<div className="mt-3 flex flex-wrap gap-1.5">
									{ORGANIZATION_PERMISSION_RESOURCES.flatMap((resource) =>
										(role.permission[resource] ?? []).map((action) => (
											<Badge key={`${resource}:${action}`} variant="secondary">
												{resource}:{action}
											</Badge>
										)),
									)}
								</div>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">
							No custom roles. Static owner, admin, and member roles remain
							available.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
