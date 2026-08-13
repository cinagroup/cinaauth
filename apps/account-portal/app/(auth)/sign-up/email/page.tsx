"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailOtpForm } from "@/components/forms/email-otp-form";
import { authClient } from "@/lib/auth-client";
import { completeEmailOtpSignUp } from "@/lib/email-otp-flow";
import {
	buildPreservedAuthPath,
	hasSignedOidcCreatePrompt,
} from "@/lib/oidc-navigation";
import { getAccountCallbackURL } from "@/lib/sign-in-experience";

function EmailSignUpContent() {
	const params = useSearchParams();
	const callbackURL = getAccountCallbackURL(params);
	const hasCreatePrompt = hasSignedOidcCreatePrompt(params);

	return (
		<AuthShell
			title="Create an account with email"
			description={
				hasCreatePrompt
					? "We'll send a short-lived code. This authorization request must create a new account."
					: "We'll send a short-lived code. Verifying it creates a new account; existing accounts must sign in instead."
			}
			backHref={buildPreservedAuthPath("/sign-up", params, callbackURL)}
			backLabel="Back to sign up"
		>
			<EmailOtpForm
				intent="signup"
				suppressAutomaticRedirect={hasCreatePrompt}
				onSuccess={async () => {
					await completeEmailOtpSignUp({
						params,
						callbackURL,
						continueOidcCreation: async () => {
							await authClient.oauth2.continue(
								{ created: true },
								{ throw: true },
							);
						},
						navigate: (path) => {
							window.location.href = path;
						},
					});
				}}
			/>
		</AuthShell>
	);
}

export default function EmailSignUpPage() {
	return (
		<Suspense
			fallback={
				<AuthShell
					title="Create an account with email"
					description="Loading the secure email sign-up flow..."
				>
					<p className="py-8 text-center text-sm text-body" role="status">
						Preparing email verification...
					</p>
				</AuthShell>
			}
		>
			<EmailSignUpContent />
		</Suspense>
	);
}
