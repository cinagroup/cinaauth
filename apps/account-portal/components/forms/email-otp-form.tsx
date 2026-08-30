"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import {
	TurnstileChallenge,
	useTurnstileChallenge,
} from "@/components/turnstile-challenge";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { authClient } from "@/lib/auth-client";
import { completeLocalSignInSuccess } from "@/lib/auth-form-response";
import type { EmailOtpIntent } from "@/lib/email-otp-flow";
import {
	normalizeEmailOtp,
	requiresExistingEmailOtpUser,
	requiresNewEmailOtpUser,
	suppressEmailOtpAutomaticRedirect,
} from "@/lib/email-otp-flow";

type EmailOtpAction = "send" | "verify" | "resend" | "continue";

type EmailOtpFormProps = {
	intent?: EmailOtpIntent;
	onSuccess?: () => void | Promise<void>;
	suppressAutomaticRedirect?: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) =>
	error instanceof Error && error.message.trim() ? error.message : fallback;

export function EmailOtpForm({
	intent = "signin",
	onSuccess,
	suppressAutomaticRedirect = false,
}: EmailOtpFormProps) {
	const { messages } = useI18n();
	const copy =
		intent === "signup"
			? {
					sendButton: messages.sendSignUpCode,
					verifyButton: messages.verifyAndContinue,
					sentMessage: messages.signUpCodeSentTo,
					successMessage: messages.emailVerifiedSuccessfully,
				}
			: {
					sendButton: messages.sendSignInCode,
					verifyButton: messages.verifyAndSignIn,
					sentMessage: messages.signInCodeSentTo,
					successMessage: messages.signedInSuccessfully,
				};
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [step, setStep] = useState<"email" | "otp">("email");
	const [action, setAction] = useState<EmailOtpAction | null>(null);
	const [errorMessage, setErrorMessage] = useState("");
	const [verificationComplete, setVerificationComplete] = useState(false);
	const { cooldown, isCoolingDown, resetCooldown, startCooldown } =
		useResendCooldown();
	const captcha = useTurnstileChallenge("/email-otp/send-verification-otp");
	const capabilities = useAuthCapabilities();
	const emailOtpReady = capabilities.data?.methods.emailOtp === true;
	const isPending = action !== null;

	const sendOtp = async (nextAction: "send" | "resend") => {
		if (
			isPending ||
			!emailOtpReady ||
			!captcha.canSubmit ||
			(nextAction === "resend" && isCoolingDown)
		) {
			return;
		}

		setAction(nextAction);
		setErrorMessage("");
		try {
			await authClient.emailOtp.sendVerificationOtp({
				email: email.trim(),
				type: "sign-in",
				fetchOptions: {
					headers: captcha.headers,
					throw: true,
				},
			});
			setStep("otp");
			setOtp("");
			startCooldown();
			toast.success(
				nextAction === "resend"
					? messages.verificationCodeResent
					: messages.verificationCodeSent,
			);
		} catch (error: unknown) {
			setErrorMessage(getErrorMessage(error, messages.unableToSendCode));
		} finally {
			captcha.reset();
			setAction(null);
		}
	};

	const continueAfterVerification = async () => {
		setAction("continue");
		setErrorMessage("");
		try {
			await onSuccess?.();
			toast.success(copy.successMessage);
		} catch (error: unknown) {
			setErrorMessage(
				getErrorMessage(error, messages.authorizationContinueError),
			);
		} finally {
			setAction(null);
		}
	};

	const handleSendOtp = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!email.trim()) return;
		void sendOtp("send");
	};

	const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isPending || otp.length !== 6) return;

		setAction("verify");
		setErrorMessage("");
		let signInResponse: unknown;
		try {
			await authClient.signIn.emailOtp(
				{
					email: email.trim(),
					otp,
					existingUserOnly: requiresExistingEmailOtpUser(intent),
					newUserOnly: requiresNewEmailOtpUser(intent),
				},
				{
					throw: true,
					onSuccess(context) {
						signInResponse = context.data;
						if (suppressAutomaticRedirect) {
							suppressEmailOtpAutomaticRedirect(context.data);
						}
					},
				},
			);
		} catch (error: unknown) {
			setOtp("");
			setErrorMessage(getErrorMessage(error, messages.invalidCode));
			setAction(null);
			return;
		}

		const completed = completeLocalSignInSuccess(signInResponse, {
			notifySuccess: () => {
				if (!suppressAutomaticRedirect) toast.success(copy.successMessage);
			},
		});
		setAction(null);
		if (!completed) return;
		if (suppressAutomaticRedirect) {
			setVerificationComplete(true);
			await continueAfterVerification();
			return;
		}

		await onSuccess?.();
	};

	if (!capabilities.isPending && !emailOtpReady) {
		return (
			<p className="text-sm leading-6 text-body" role="status">
				{messages.emailCodeUnavailable}
			</p>
		);
	}

	if (verificationComplete) {
		return (
			<div className="flex flex-col gap-3">
				<p className="text-sm leading-6 text-body">
					{messages.emailVerifiedContinue}
				</p>
				{errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
				<Button
					type="button"
					className="w-full"
					disabled={isPending}
					onClick={() => void continueAfterVerification()}
				>
					{action === "continue" ? (
						<Loader2 size={16} className="animate-spin" aria-hidden />
					) : null}
					{messages.continueToApplication}
				</Button>
			</div>
		);
	}

	if (step === "email") {
		return (
			<form onSubmit={handleSendOtp} className="flex flex-col gap-4">
				<FieldGroup>
					<Field data-invalid={Boolean(errorMessage)}>
						<FieldLabel htmlFor="email-otp-address">
							{messages.emailLabel}
						</FieldLabel>
						<Input
							id="email-otp-address"
							name="email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(event) => {
								setEmail(event.target.value);
								setErrorMessage("");
							}}
							required
							disabled={isPending}
							autoComplete="email"
							aria-invalid={Boolean(errorMessage)}
						/>
						<FieldDescription>{messages.emailDescription}</FieldDescription>
						{errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
					</Field>
				</FieldGroup>
				<TurnstileChallenge challenge={captcha} />
				<Button
					type="submit"
					className="w-full"
					disabled={
						isPending ||
						capabilities.isPending ||
						!emailOtpReady ||
						!captcha.canSubmit
					}
				>
					{action === "send" ? (
						<Loader2 size={16} className="animate-spin" aria-hidden />
					) : null}
					{copy.sendButton}
				</Button>
			</form>
		);
	}

	return (
		<form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
			<FieldGroup>
				<Field data-invalid={Boolean(errorMessage)}>
					<FieldLabel htmlFor="email-otp-code">
						{messages.verificationCode}
					</FieldLabel>
					<FieldDescription>
						{copy.sentMessage}{" "}
						<span className="font-medium text-foreground">{email.trim()}</span>.
					</FieldDescription>
					<Input
						id="email-otp-code"
						name="otp"
						type="text"
						inputMode="numeric"
						pattern="[0-9]{6}"
						minLength={6}
						maxLength={6}
						placeholder="000000"
						value={otp}
						onChange={(event) => {
							setOtp(normalizeEmailOtp(event.target.value));
							setErrorMessage("");
						}}
						required
						disabled={isPending}
						className="text-center font-mono text-lg tracking-[0.5em]"
						autoComplete="one-time-code"
						autoFocus
						aria-invalid={Boolean(errorMessage)}
					/>
					{errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
				</Field>
			</FieldGroup>
			<Button
				type="submit"
				className="w-full"
				disabled={isPending || otp.length !== 6}
			>
				{action === "verify" ? (
					<Loader2 size={16} className="animate-spin" aria-hidden />
				) : null}
				{copy.verifyButton}
			</Button>
			<TurnstileChallenge challenge={captcha} />
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Button
					type="button"
					variant="link"
					size="sm"
					disabled={isPending || isCoolingDown || !captcha.canSubmit}
					onClick={() => void sendOtp("resend")}
				>
					{action === "resend" ? (
						<Loader2 size={14} className="animate-spin" aria-hidden />
					) : null}
					{isCoolingDown
						? `${messages.resendIn} ${cooldown}s`
						: messages.resendCode}
				</Button>
				<Button
					type="button"
					variant="link"
					size="sm"
					disabled={isPending}
					onClick={() => {
						setStep("email");
						setOtp("");
						setErrorMessage("");
						resetCooldown();
						captcha.reset();
					}}
				>
					{messages.changeEmail}
				</Button>
			</div>
		</form>
	);
}
