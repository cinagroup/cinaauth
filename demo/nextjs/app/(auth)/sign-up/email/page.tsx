"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmailOtpForm } from "@/components/forms/email-otp-form";

export default function EmailSignUpPage() {
	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
			<div className="w-full max-w-[400px]">
				<div className="flex flex-col gap-6">
					{/* Back Link */}
					<Link
						href="/sign-up"
						className="text-sm text-body hover:text-ink flex items-center gap-1 w-fit"
					>
						<ArrowLeft size={16} />
						Back to sign up.
					</Link>

					{/* Header */}
					{/* Spec: display-lg (32/600/-1.28px), sentence-case + period. */}
					<h1 className="text-[32px] font-semibold leading-[40px] tracking-[-1.28px] text-ink">
						Sign up with email.
					</h1>

					<p className="text-sm text-body">
						We'll send you a verification code to create your account.
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
