"use client";

import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Settings2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationActiveMutation } from "@/data/organization/organization-active-mutation";
import { useOrganizationDetailQuery } from "@/data/organization/organization-detail-query";
import { useOrganizationListQuery } from "@/data/organization/organization-list-query";
import { useSessionQuery } from "@/data/user/session-query";
import type { Session } from "@/lib/auth";
import { getOrganizationRoleLabel } from "@/lib/organization-console";

const OrganizationCard = (props: { session: Session | null }) => {
	const { data: sessionData } = useSessionQuery();
	const { data: organizations } = useOrganizationListQuery();
	const { data: activeOrganization, isFetching: isOrganizationFetching } =
		useOrganizationDetailQuery();
	const setActiveMutation = useOrganizationActiveMutation();
	const session = sessionData || props.session;
	const pendingInvitations =
		activeOrganization?.invitations?.filter(
			(invitation) => invitation.status === "pending",
		) ?? [];

	if (isOrganizationFetching) return <OrganizationCardSkeleton />;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Organization</CardTitle>
				<div className="flex justify-between">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="gap-1 px-0">
								{activeOrganization?.name || "Personal"}
								<ChevronDownIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem
								onClick={() =>
									setActiveMutation.mutate({ organizationId: null })
								}
							>
								Personal
							</DropdownMenuItem>
							{organizations?.map((organization) => (
								<DropdownMenuItem
									key={organization.id}
									onClick={() => {
										if (organization.id !== activeOrganization?.id) {
											setActiveMutation.mutate({
												organizationId: organization.id,
											});
										}
									}}
								>
									{organization.name}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<Button asChild size="sm" variant="outline">
						<Link href="/dashboard/organization">
							<Settings2 className="mr-2 h-4 w-4" /> Manage
						</Link>
					</Button>
				</div>
				<div className="flex items-center gap-2">
					<Avatar>
						<AvatarImage
							src={activeOrganization?.logo || session?.user.image || undefined}
						/>
						<AvatarFallback>
							{activeOrganization?.name?.charAt(0) ||
								session?.user.name?.charAt(0) ||
								"P"}
						</AvatarFallback>
					</Avatar>
					<div>
						<p>{activeOrganization?.name || "Personal workspace"}</p>
						<p className="text-xs text-muted-foreground">
							{activeOrganization?.members?.length || 1} members
						</p>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-8 md:flex-row">
					<div className="flex grow flex-col gap-2">
						<p className="border-b-2 border-b-foreground/10 font-medium">
							Members
						</p>
						{activeOrganization?.members?.map((member) => (
							<div key={member.id} className="flex items-center gap-2">
								<Avatar className="h-9 w-9">
									<AvatarImage src={member.user.image || undefined} />
									<AvatarFallback>{member.user.name?.charAt(0)}</AvatarFallback>
								</Avatar>
								<div>
									<p className="text-sm">{member.user.name}</p>
									<p className="text-xs text-muted-foreground">
										{getOrganizationRoleLabel(member.role)}
									</p>
								</div>
							</div>
						))}
						{!activeOrganization?.id && (
							<div className="flex items-center gap-2">
								<Avatar>
									<AvatarImage src={session?.user.image || undefined} />
									<AvatarFallback>
										{session?.user.name?.charAt(0)}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="text-sm">{session?.user.name}</p>
									<p className="text-xs text-muted-foreground">Owner</p>
								</div>
							</div>
						)}
					</div>
					<div className="flex grow flex-col gap-2">
						<p className="border-b-2 border-b-foreground/10 font-medium">
							Pending invitations
						</p>
						{pendingInvitations.map((invitation) => (
							<div key={invitation.id}>
								<p className="text-sm">{invitation.email}</p>
								<p className="text-xs text-muted-foreground">
									{getOrganizationRoleLabel(invitation.role)}
								</p>
							</div>
						))}
						{pendingInvitations.length === 0 && (
							<p className="text-sm text-muted-foreground">
								No active invitations
							</p>
						)}
						{!activeOrganization?.id && (
							<Label className="text-xs text-muted-foreground">
								Personal workspaces do not have invitations.
							</Label>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default OrganizationCard;

function OrganizationCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Organization</CardTitle>
				<div className="flex justify-between mt-2">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-8 w-24" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-10 w-10 rounded-full" />
					<div className="space-y-1">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Skeleton className="h-20 w-full" />
			</CardContent>
		</Card>
	);
}
