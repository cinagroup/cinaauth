"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type EmailOtpFormProps = {
	onSuccess?: () => void;
};

export function EmailOtpForm({ onSuccess }: EmailOtpFormProps) {
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [step, setStep] = useState<"email" | "otp">("email");
	const [loading, setLoading] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);

	const handleSendOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		setLoading(true);
		try {
			await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "sign-in",
			});
			toast.success("Verification code sent to your email");
			setStep("otp");
			setResendCooldown(60);
			startCooldown(60);
		} catch (error: any) {
			toast.error(error?.message || "Failed to send verification code");
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !otp) return;

		setLoading(true);
		try {
			await authClient.signIn.emailOtp({
				email,
				otp,
			});
			toast.success("Successfully signed in");
			onSuccess?.();
		} catch (error: any) {
			toast.error(error?.message || "Invalid verification code");
		} finally {
			setLoading(false);
		}
	};

	const startCooldown = (seconds: number) => {
		const interval = setInterval(() => {
			setResendCooldown((prev) => {
				if (prev <= 1) {
					clearInterval(interval);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const handleResendOtp = async () => {
		if (resendCooldown > 0) return;
		setLoading(true);
		try {
			await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "sign-in",
			});
			toast.success("Verification code resent");
			setResendCooldown(60);
			startCooldown(60);
		} catch (error: any) {
			toast.error(error?.message || "Failed to resend verification code");
		} finally {
			setLoading(false);
		}
	};

	if (step === "email") {
		return (
			<form onSubmit={handleSendOtp} className="flex flex-col gap-3">
				<div className="flex flex-col gap-2">
					<label htmlFor="email" className="text-sm font-medium">
						Email
					</label>
					<Input
						id="email"
						type="email"
						placeholder="you@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						disabled={loading}
						autoComplete="email"
					/>
				</div>
				<Button type="submit" className="w-full" disabled={loading}>
					{loading ? "Sending..." : "Send verification code"}
				</Button>
			</form>
		);
	}

	return (
		<form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
			<div className="flex flex-col gap-2">
				<label htmlFor="otp" className="text-sm font-medium">
					Enter verification code
				</label>
				<p className="text-xs text-muted-foreground">
					We sent a 6-digit code to{" "}
					<span className="font-medium text-foreground">{email}</span>
				</p>
				<Input
					id="otp"
					type="text"
					inputMode="numeric"
					pattern="[0-9]*"
					maxLength={6}
					placeholder="000000"
					value={otp}
					onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
					required
					disabled={loading}
					className={cn("text-center text-lg tracking-[0.5em] font-mono")}
					autoFocus
				/>
			</div>
			<Button
				type="submit"
				className="w-full"
				disabled={loading || otp.length !== 6}
			>
				{loading ? "Verifying..." : "Verify and sign in"}
			</Button>
			<div className="flex items-center justify-between text-xs">
				<button
					type="button"
					onClick={handleResendOtp}
					disabled={loading || resendCooldown > 0}
					className="text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
				>
					{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
				</button>
				<button
					type="button"
					onClick={() => {
						setStep("email");
						setOtp("");
					}}
					disabled={loading}
					className="text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50"
				>
					Change email
				</button>
			</div>
		</form>
	);
}
