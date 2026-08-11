"use client";

import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailOtpForm } from "@/components/forms/email-otp-form";
import {
	buildPreservedAuthPath,
	hasSignedOidcAuthorizationQuery,
} from "@/lib/oidc-navigation";
import { sanitizeAccountCallbackURL } from "@/lib/sign-in-experience";

export default function EmailSignInPage() {
	const params = useSearchParams();
	const callbackURL = sanitizeAccountCallbackURL(
		params.get("callbackURL") ?? "/dashboard",
	);
	const hasOidcQuery = hasSignedOidcAuthorizationQuery(params);

	return (
		<AuthShell
			title="Check your email"
			description="We’ll send a short-lived verification code. No password is required."
			backHref={buildPreservedAuthPath("/sign-in", params, callbackURL)}
		>
			<EmailOtpForm
				onSuccess={() => {
					if (!hasOidcQuery) window.location.href = callbackURL;
				}}
			/>
		</AuthShell>
	);
}
