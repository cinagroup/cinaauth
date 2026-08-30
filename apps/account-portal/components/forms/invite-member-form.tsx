"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useInviteMemberMutation } from "@/data/organization/invitation-member-mutation";
import type { OrganizationRole } from "@/lib/auth";

const ORGANIZATION_ROLES = {
	ADMIN: "admin",
	MEMBER: "member",
} as const satisfies Record<string, OrganizationRole>;

const createInviteMemberSchema = (
	validEmailRequired: string,
	selectRoleRequired: string,
) =>
	z.object({
		email: z.email(validEmailRequired),
		role: z.enum(["admin", "member"], {
			error: selectRoleRequired,
		}),
	});

type InviteMemberFormValues = z.infer<
	ReturnType<typeof createInviteMemberSchema>
>;

interface InviteMemberFormProps {
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

export function InviteMemberForm({
	onSuccess,
	onError,
}: InviteMemberFormProps) {
	const { messages } = useDashboardI18n();
	const inviteMemberSchema = createInviteMemberSchema(
		messages.validEmailRequired,
		messages.selectRoleRequired,
	);
	const inviteMutation = useInviteMemberMutation();

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<InviteMemberFormValues>({
		resolver: zodResolver(inviteMemberSchema),
		defaultValues: {
			email: "",
			role: "member",
		},
	});

	const onSubmit = (values: InviteMemberFormValues) => {
		inviteMutation.mutate(
			{
				email: values.email,
				role: values.role as OrganizationRole,
			},
			{
				onSuccess: () => {
					reset();
					onSuccess?.();
				},
				onError: (error) => {
					onError?.(error.message);
				},
			},
		);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<Controller
					name="email"
					control={control}
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="invite-email">{messages.email}</FieldLabel>
							<Input
								id="invite-email"
								type="email"
								placeholder="member@example.com"
								disabled={inviteMutation.isPending}
								{...field}
							/>
							<FieldError>{errors.email?.message}</FieldError>
						</Field>
					)}
				/>

				<Controller
					name="role"
					control={control}
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="invite-role">{messages.role}</FieldLabel>
							<Select
								value={field.value}
								onValueChange={field.onChange}
								disabled={inviteMutation.isPending}
							>
								<SelectTrigger id="invite-role">
									<SelectValue placeholder={messages.selectRole} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ORGANIZATION_ROLES.ADMIN}>
										{messages.admin}
									</SelectItem>
									<SelectItem value={ORGANIZATION_ROLES.MEMBER}>
										{messages.member}
									</SelectItem>
								</SelectContent>
							</Select>
							<FieldError>{errors.role?.message}</FieldError>
						</Field>
					)}
				/>

				<Button type="submit" disabled={inviteMutation.isPending}>
					{inviteMutation.isPending ? (
						<Loader2 size={15} className="animate-spin" />
					) : (
						messages.invite
					)}
				</Button>
			</FieldGroup>
		</form>
	);
}
