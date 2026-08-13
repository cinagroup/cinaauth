"use client";

import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/forms/sign-in-form";
import {
	buildPreservedAuthPath,
	hasSignedOidcAuthorizationQuery,
} from "@/lib/oidc-navigation";
import { getAccountCallbackURL } from "@/lib/sign-in-experience";

export default function PasswordSignInPage() {
	const params = useSearchParams();
	const callbackURL = getAccountCallbackURL(params);
	const hasOidcQuery = hasSignedOidcAuthorizationQuery(params);

	return (
		<AuthShell
			title="Sign in with your password"
			description="Enter the credentials for your CinaSeek account."
			backHref={buildPreservedAuthPath("/sign-in", params, callbackURL)}
		>
			<SignInForm
				callbackURL={callbackURL}
				showPasswordToggle
				onSuccess={() => {
					if (!hasOidcQuery) window.location.href = callbackURL;
				}}
			/>
		</AuthShell>
	);
}
