"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
	TurnstileChallenge,
	useTurnstileChallenge,
} from "@/components/turnstile-challenge";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { userKeys } from "@/data/user/keys";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { authClient } from "@/lib/auth-client";
import { formatDashboardMessage } from "@/lib/dashboard-i18n";
import {
	EMAIL_VERIFICATION_OTP_LENGTH,
	normalizeEmailVerificationOtp,
} from "@/lib/email-verification-otp";

type VerificationAction = "send" | "resend" | "verify";

const getErrorMessage = (error: unknown, fallback: string) =>
	error instanceof Error && error.message.trim() ? error.message : fallback;

export function EmailVerificationOtpForm({ email }: { email: string }) {
	const { messages } = useDashboardI18n();
	const router = useRouter();
	const queryClient = useQueryClient();
	const inputRef = useRef<HTMLInputElement>(null);
	const captcha = useTurnstileChallenge("/email-otp/send-verification-otp");
	const [action, setAction] = useState<VerificationAction | null>(null);
	const [codeSent, setCodeSent] = useState(false);
	const { cooldown, isCoolingDown, startCooldown } = useResendCooldown();
	const [errorMessage, setErrorMessage] = useState("");
	const [otp, setOtp] = useState("");
	const [verified, setVerified] = useState(false);
	const isPending = action !== null;

	useEffect(() => {
		if (codeSent && !isPending) inputRef.current?.focus();
	}, [codeSent, isPending]);

	const sendCode = async (nextAction: "send" | "resend") => {
		if (isPending || (nextAction === "resend" && isCoolingDown)) return;

		setAction(nextAction);
		setErrorMessage("");

		try {
			await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "email-verification",
				fetchOptions: {
					headers: captcha.headers,
					throw: true,
				},
			});

			setCodeSent(true);
			setOtp("");
			startCooldown();
		} catch (error: unknown) {
			setErrorMessage(
				getErrorMessage(error, messages.unableToSendCode),
			);
		} finally {
			captcha.reset();
			setAction(null);
		}
	};

	const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isPending) return;

		if (otp.length !== EMAIL_VERIFICATION_OTP_LENGTH) {
			setErrorMessage(messages.completeSixDigitCode);
			return;
		}

		setAction("verify");
		setErrorMessage("");

		try {
			const result = await authClient.emailOtp.verifyEmail({ email, otp });
			if (result.error || result.data?.status !== true) {
				throw new Error(
					result.error?.message ||
						messages.codeVerificationFailed,
				);
			}
		} catch (error: unknown) {
			setOtp("");
			setErrorMessage(
				getErrorMessage(error, messages.codeVerificationFailed),
			);
			setAction(null);
			return;
		}

		setVerified(true);
		await queryClient
			.invalidateQueries({ queryKey: userKeys.session() })
			.catch(() => undefined);
		router.refresh();
		setAction(null);
	};

	if (verified) return null;

	if (!email) {
		return (
			<Alert variant="destructive">
				<Mail aria-hidden />
				<AlertTitle>{messages.emailVerificationUnavailable}</AlertTitle>
				<AlertDescription>
					{messages.emailMissing}
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<Alert>
			<Mail aria-hidden />
			<AlertTitle>{messages.verifyEmailAddress}</AlertTitle>
			<AlertDescription>
				{codeSent ? (
					<form onSubmit={verifyCode} className="flex w-full flex-col gap-3">
						<FieldGroup>
							<Field data-invalid={Boolean(errorMessage)}>
								<FieldLabel htmlFor="email-verification-code">
									{messages.verificationCodeLabel}
								</FieldLabel>
								<FieldDescription>
									{formatDashboardMessage(messages.enterCodeSentTo, { email })}
								</FieldDescription>
								<Input
									ref={inputRef}
									id="email-verification-code"
									name="email-verification-code"
									type="text"
									inputMode="numeric"
									pattern="[0-9]{6}"
									minLength={EMAIL_VERIFICATION_OTP_LENGTH}
									maxLength={EMAIL_VERIFICATION_OTP_LENGTH}
									autoComplete="one-time-code"
									placeholder="000000"
									value={otp}
									disabled={isPending}
									aria-invalid={Boolean(errorMessage)}
									className="font-mono text-center text-lg tracking-[0.4em]"
									onChange={(event) => {
										setOtp(normalizeEmailVerificationOtp(event.target.value));
										setErrorMessage("");
									}}
								/>
								<FieldError>{errorMessage}</FieldError>
							</Field>
						</FieldGroup>

						<Button
							type="submit"
							disabled={
								isPending || otp.length !== EMAIL_VERIFICATION_OTP_LENGTH
							}
						>
							{action === "verify" ? (
								<Loader2 data-icon="inline-start" className="animate-spin" />
							) : null}
							{messages.verifyEmail}
						</Button>

						<TurnstileChallenge challenge={captcha} />

						<Button
							type="button"
							variant="outline"
							disabled={isPending || isCoolingDown || !captcha.canSubmit}
							onClick={() => void sendCode("resend")}
						>
							{action === "resend" ? (
								<Loader2 data-icon="inline-start" className="animate-spin" />
							) : null}
							{isCoolingDown
								? `${messages.resendIn} ${cooldown}s`
								: messages.resendCode}
						</Button>
					</form>
				) : (
					<div className="flex w-full flex-col gap-3">
						<p>{formatDashboardMessage(messages.sendCodeTo, { email })}</p>
						{errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
						<TurnstileChallenge challenge={captcha} />
						<Button
							type="button"
							variant="secondary"
							disabled={isPending || !captcha.canSubmit}
							onClick={() => void sendCode("send")}
						>
							{action === "send" ? (
								<Loader2 data-icon="inline-start" className="animate-spin" />
							) : null}
							{messages.sendVerificationCode}
						</Button>
					</div>
				)}
			</AlertDescription>
		</Alert>
	);
}
