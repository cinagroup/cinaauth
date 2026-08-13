"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Page() {
	const [isSubmitted, setIsSubmitted] = useState(false);

	if (isSubmitted) {
		return (
			<AuthShell
				title="Check your email"
				description="We've sent a password reset link to your email."
				backHref="/sign-in"
			>
				<Alert variant="default">
					<CheckCircle2 aria-hidden="true" />
					<AlertDescription>
						If you don't see the email, check your spam folder.
					</AlertDescription>
				</Alert>
			</AuthShell>
		);
	}

	return (
		<AuthShell
			title="Forgot password"
			description="Enter your email to reset your password."
			backHref="/sign-in"
		>
			<ForgotPasswordForm onSuccess={() => setIsSubmitted(true)} />
		</AuthShell>
	);
}
