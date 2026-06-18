"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmailOtpForm } from "@/components/forms/email-otp-form";

export default function EmailSignInPage() {
	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
			<div className="w-full max-w-[400px]">
				<div className="flex flex-col gap-6">
					{/* Back Link */}
					<Link
						href="/sign-in"
						className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
					>
						<ArrowLeft size={16} />
						Back to sign in
					</Link>

					{/* Header */}
					<h1 className="text-3xl font-semibold tracking-tight">
						Sign in with Email
					</h1>

					<p className="text-sm text-muted-foreground">
						We'll send you a verification code to sign in without a password.
					</p>

					{/* Email OTP Form */}
					<EmailOtpForm
						onSuccess={() => (window.location.href = "/dashboard")}
					/>
				</div>
			</div>
		</div>
	);
}
