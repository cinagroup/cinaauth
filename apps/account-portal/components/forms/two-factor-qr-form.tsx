"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import * as z from "zod";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { Button } from "@/components/ui/button";
import CopyButton from "@/components/ui/copy-button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { getTwoFactorPasswordBody } from "@/lib/security-center";

const createPasswordSchema = (passwordMinEight: string) =>
	z.object({
		password: z.string().min(8, passwordMinEight),
	});

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordSchema>>;

interface TwoFactorQrFormProps {
	onSuccess?: (totpURI: string) => void;
	requiresPassword?: boolean;
}

export function TwoFactorQrForm({
	onSuccess,
	requiresPassword = true,
}: TwoFactorQrFormProps) {
	const { messages } = useDashboardI18n();
	const passwordSchema = createPasswordSchema(messages.passwordMinEight);
	const [loading, startTransition] = useTransition();
	const [totpURI, setTotpURI] = useState<string>("");

	const form = useForm<PasswordFormValues>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			password: "",
		},
	});

	const loadTotpURI = (password: string) => {
		startTransition(async () => {
			await authClient.twoFactor.getTotpUri(
				getTwoFactorPasswordBody(requiresPassword, password),
				{
					onSuccess(context) {
						setTotpURI(context.data.totpURI);
						onSuccess?.(context.data.totpURI);
					},
					onError(context) {
						toast.error(context.error.message);
					},
				},
			);
		});
	};

	const onSubmit = (data: PasswordFormValues) => {
		loadTotpURI(data.password);
	};

	if (totpURI) {
		return (
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-center">
					<QRCode value={totpURI} />
				</div>
				<div className="flex gap-2 items-center justify-center">
					<p className="text-sm text-muted-foreground">
						{messages.copyUriToClipboard}
					</p>
					<CopyButton textToCopy={totpURI} />
				</div>
			</div>
		);
	}

	if (!requiresPassword) {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-sm text-muted-foreground">
					{messages.passwordlessSecurityConfirmation}
				</p>
				<Button
					type="button"
					disabled={loading}
					onClick={() => loadTotpURI("")}
				>
					{loading ? (
						<Loader2 size={16} className="animate-spin" />
					) : (
						messages.showQrCode
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
							<FieldLabel htmlFor="qr-password">{messages.password}</FieldLabel>
							<PasswordInput
								{...field}
								id="qr-password"
								placeholder={messages.enterPassword}
								aria-invalid={fieldState.invalid}
								autoComplete="current-password"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</FieldGroup>
			<Button type="submit" disabled={loading}>
				{loading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					messages.showQrCode
				)}
			</Button>
		</form>
	);
}
