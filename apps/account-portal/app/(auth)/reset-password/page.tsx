"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Page() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token") ?? "";
	if (!token) {
		return (
			<AuthShell
				title="Invalid reset link"
				description="This password reset link is missing its secure token."
				backHref="/sign-in"
			>
				<Alert variant="destructive" role="alert">
					<AlertDescription>
						Request a new password reset email, then use the complete link from
						that message.
					</AlertDescription>
				</Alert>
			</AuthShell>
		);
	}

	return (
		<AuthShell
			title="Reset password"
			description="Enter and confirm a new password for your CinaSeek account."
			backHref="/sign-in"
		>
			<ResetPasswordForm
				token={token}
				onSuccess={() => router.push("/sign-in")}
			/>
		</AuthShell>
	);
}
