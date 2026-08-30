"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2, ShieldCheck } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { getTwoFactorPasswordBody } from "@/lib/security-center";
import { formatBackupCodesText } from "@/lib/two-factor-verification";

const createPasswordSchema = (passwordMinEight: string) =>
	z.object({
		password: z.string().min(8, passwordMinEight),
	});

const createOtpSchema = (otpMinSix: string) =>
	z.object({
		otp: z.string().min(6, otpMinSix),
	});

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordSchema>>;
type OtpFormValues = z.infer<ReturnType<typeof createOtpSchema>>;
type EnrollmentStep = "password" | "verify" | "backupCodes";

interface TwoFactorEnableFormProps {
	onSuccess?: () => void;
	onBackupCodesPendingChange?: (pending: boolean) => void;
	requiresPassword?: boolean;
}

export function TwoFactorEnableForm({
	onSuccess,
	onBackupCodesPendingChange,
	requiresPassword = true,
}: TwoFactorEnableFormProps) {
	const { messages } = useDashboardI18n();
	const passwordSchema = createPasswordSchema(messages.passwordMinEight);
	const otpSchema = createOtpSchema(messages.otpMinSix);
	const [loading, startTransition] = useTransition();
	const [totpURI, setTotpURI] = useState<string>("");
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [step, setStep] = useState<EnrollmentStep>("password");

	const passwordForm = useForm<PasswordFormValues>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			password: "",
		},
	});

	const otpForm = useForm<OtpFormValues>({
		resolver: zodResolver(otpSchema),
		defaultValues: {
			otp: "",
		},
	});

	const beginEnrollment = (password: string) => {
		startTransition(async () => {
			await authClient.twoFactor.enable({
				...getTwoFactorPasswordBody(requiresPassword, password),
				fetchOptions: {
					onSuccess(ctx) {
						setTotpURI(ctx.data.totpURI);
						setBackupCodes(ctx.data.backupCodes);
						setStep("verify");
					},
					onError(context) {
						toast.error(context.error.message);
					},
				},
			});
		});
	};

	const onPasswordSubmit = (data: PasswordFormValues) => {
		beginEnrollment(data.password);
	};

	const onOtpSubmit = (data: OtpFormValues) => {
		startTransition(async () => {
			await authClient.twoFactor.verifyTotp({
				code: data.otp,
				fetchOptions: {
					onSuccess() {
						onBackupCodesPendingChange?.(true);
						setStep("backupCodes");
					},
					onError(context) {
						toast.error(context.error.message);
						otpForm.reset();
					},
				},
			});
		});
	};

	const finishEnrollment = () => {
		onBackupCodesPendingChange?.(false);
		setBackupCodes([]);
		setTotpURI("");
		toast.success(messages.twoFactorEnabledSuccess);
		onSuccess?.();
	};

	const downloadBackupCodes = () => {
		const blob = new Blob([formatBackupCodesText(backupCodes)], {
			type: "text/plain;charset=utf-8",
		});
		const objectURL = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = objectURL;
		anchor.download = "cinaseek-backup-codes.txt";
		anchor.click();
		URL.revokeObjectURL(objectURL);
	};

	if (step === "backupCodes") {
		const backupCodesText = formatBackupCodesText(backupCodes);
		return (
			<div className="flex flex-col gap-4">
				<div className="space-y-2" role="status">
					<div className="flex items-center gap-2 font-medium">
						<ShieldCheck className="h-5 w-5 text-green-600" />
						{messages.twoFactorEnabledHeading}
					</div>
					<p className="text-sm text-muted-foreground">
						{messages.saveBackupCodes}
					</p>
				</div>
				<ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-4 font-mono text-sm">
					{backupCodes.map((backupCode) => (
						<li className="tracking-wide" key={backupCode}>
							{backupCode}
						</li>
					))}
				</ul>
				<div className="flex flex-wrap gap-2">
					<div className="flex items-center gap-1">
						<span className="text-sm">{messages.copyAllCodes}</span>
						<CopyButton textToCopy={backupCodesText} />
					</div>
					<Button type="button" variant="outline" onClick={downloadBackupCodes}>
						<Download className="h-4 w-4" />
						{messages.downloadTextFile}
					</Button>
				</div>
				<Button type="button" onClick={finishEnrollment}>
					{messages.savedBackupCodes}
				</Button>
			</div>
		);
	}

	if (step === "verify" && totpURI) {
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
				<form
					onSubmit={otpForm.handleSubmit(onOtpSubmit)}
					className="flex flex-col gap-4"
				>
					<FieldGroup>
						<Controller
							name="otp"
							control={otpForm.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="enable-otp">
										{messages.scanQrAndEnterCode}
									</FieldLabel>
									<Input
										{...field}
										id="enable-otp"
										placeholder={messages.enterOtpCode}
										aria-invalid={fieldState.invalid}
										autoComplete="one-time-code"
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>
					<Button type="submit" disabled={loading}>
						{loading ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							messages.verifyAndEnable
						)}
					</Button>
				</form>
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
					onClick={() => beginEnrollment("")}
				>
					{loading ? (
						<Loader2 size={16} className="animate-spin" />
					) : (
						messages.continue
					)}
				</Button>
			</div>
		);
	}

	return (
		<form
			onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
			className="flex flex-col gap-4"
		>
			<FieldGroup>
				<Controller
					name="password"
					control={passwordForm.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="enable-password">
								{messages.password}
							</FieldLabel>
							<PasswordInput
								{...field}
								id="enable-password"
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
					messages.continue
				)}
			</Button>
		</form>
	);
}
