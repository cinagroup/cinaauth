"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import {
	TurnstileChallenge,
	useTurnstileChallenge,
} from "@/components/turnstile-challenge";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
	email: z.email("Please enter a valid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
	onSuccess?: () => void;
	onError?: (error: string) => void;
	redirectTo?: string;
}

export function ForgotPasswordForm({
	onSuccess,
	onError,
	redirectTo = "/reset-password",
}: ForgotPasswordFormProps) {
	const [loading, startTransition] = useTransition();
	const captcha = useTurnstileChallenge();
	const capabilities = useAuthCapabilities();
	const emailDeliveryReady = capabilities.data?.methods.magicLink === true;

	const form = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = (data: ForgotPasswordFormValues) => {
		if (!emailDeliveryReady) return;
		startTransition(async () => {
			try {
				await authClient.requestPasswordReset({
					email: data.email,
					redirectTo,
					fetchOptions: { headers: captcha.headers },
				});
				onSuccess?.();
			} catch {
				onError?.("An error occurred. Please try again.");
			} finally {
				captcha.reset();
			}
		});
	};

	if (!capabilities.isPending && !emailDeliveryReady) {
		return (
			<p className="text-sm text-body" role="status">
				Password-reset email delivery is temporarily unavailable.
			</p>
		);
	}

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
			<FieldGroup>
				<Controller
					name="email"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="forgot-email">Email</FieldLabel>
							<Input
								{...field}
								id="forgot-email"
								type="email"
								placeholder="Enter your email"
								aria-invalid={fieldState.invalid}
								autoComplete="email"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</FieldGroup>
			<TurnstileChallenge challenge={captcha} />
			<Button
				type="submit"
				className="w-full"
				disabled={
					loading ||
					capabilities.isPending ||
					!emailDeliveryReady ||
					!captcha.canSubmit
				}
			>
				{loading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					"Send reset link"
				)}
			</Button>
		</form>
	);
}
