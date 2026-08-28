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
import {
	EMAIL_VERIFICATION_OTP_LENGTH,
	normalizeEmailVerificationOtp,
} from "@/lib/email-verification-otp";

type VerificationAction = "send" | "resend" | "verify";

const getErrorMessage = (error: unknown, fallback: string) =>
	error instanceof Error && error.message.trim() ? error.message : fallback;

export function EmailVerificationOtpForm({ email }: { email: string }) {
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
				getErrorMessage(error, "Unable to send the verification code."),
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
			setErrorMessage("Enter the complete six-digit verification code.");
			return;
		}

		setAction("verify");
		setErrorMessage("");

		try {
			const result = await authClient.emailOtp.verifyEmail({ email, otp });
			if (result.error || result.data?.status !== true) {
				throw new Error(
					result.error?.message ||
						"The verification code could not be verified.",
				);
			}
		} catch (error: unknown) {
			setOtp("");
			setErrorMessage(
				getErrorMessage(error, "The verification code could not be verified."),
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
				<AlertTitle>Email verification is unavailable</AlertTitle>
				<AlertDescription>
					Your signed-in session does not include an email address.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<Alert>
			<Mail aria-hidden />
			<AlertTitle>Verify your email address</AlertTitle>
			<AlertDescription>
				{codeSent ? (
					<form onSubmit={verifyCode} className="flex w-full flex-col gap-3">
						<FieldGroup>
							<Field data-invalid={Boolean(errorMessage)}>
								<FieldLabel htmlFor="email-verification-code">
									Verification code
								</FieldLabel>
								<FieldDescription>
									Enter the six-digit code sent to {email}.
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
							Verify email
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
							{isCoolingDown ? `Resend in ${cooldown}s` : "Resend code"}
						</Button>
					</form>
				) : (
					<div className="flex w-full flex-col gap-3">
						<p>Send a six-digit verification code to {email}.</p>
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
							Send verification code
						</Button>
					</div>
				)}
			</AlertDescription>
		</Alert>
	);
}
