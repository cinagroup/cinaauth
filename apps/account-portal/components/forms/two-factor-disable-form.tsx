"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { getTwoFactorPasswordBody } from "@/lib/security-center";

const createDisableSchema = (passwordMinEight: string) =>
	z.object({
		password: z.string().min(8, passwordMinEight),
	});

type DisableFormValues = z.infer<ReturnType<typeof createDisableSchema>>;

interface TwoFactorDisableFormProps {
	onSuccess?: () => void;
	requiresPassword?: boolean;
}

export function TwoFactorDisableForm({
	onSuccess,
	requiresPassword = true,
}: TwoFactorDisableFormProps) {
	const { messages } = useDashboardI18n();
	const disableSchema = createDisableSchema(messages.passwordMinEight);
	const [loading, startTransition] = useTransition();

	const form = useForm<DisableFormValues>({
		resolver: zodResolver(disableSchema),
		defaultValues: {
			password: "",
		},
	});

	const disableTwoFactor = (password: string) => {
		startTransition(async () => {
			await authClient.twoFactor.disable({
				...getTwoFactorPasswordBody(requiresPassword, password),
				fetchOptions: {
					onSuccess() {
						toast.success(messages.twoFactorDisabledSuccess);
						onSuccess?.();
					},
					onError(context) {
						toast.error(context.error.message);
					},
				},
			});
		});
	};

	const onSubmit = (data: DisableFormValues) => {
		disableTwoFactor(data.password);
	};

	if (!requiresPassword) {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-sm text-muted-foreground">
					{messages.passwordlessSecurityConfirmation}
				</p>
				<Button
					type="button"
					variant="destructive"
					disabled={loading}
					onClick={() => disableTwoFactor("")}
				>
					{loading ? (
						<Loader2 size={16} className="animate-spin" />
					) : (
						messages.disableTwoFactor
					)}
				</Button>
			</div>
		);
	}

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			className="flex flex-col gap-4"
		>
			<FieldGroup>
				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="disable-password">
								{messages.password}
							</FieldLabel>
							<PasswordInput
								{...field}
								id="disable-password"
								placeholder={messages.enterPassword}
								aria-invalid={fieldState.invalid}
								autoComplete="current-password"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</FieldGroup>
			<Button type="submit" variant="destructive" disabled={loading}>
				{loading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					messages.disableTwoFactor
				)}
			</Button>
		</form>
	);
}
