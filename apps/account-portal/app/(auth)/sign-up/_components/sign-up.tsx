"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OAuthProviderButtons } from "@/components/oauth-provider-buttons";
import { Button } from "@/components/ui/button";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import {
	buildPreservedAuthPath,
	hasSignedOidcCreatePrompt,
} from "@/lib/oidc-navigation";
import { getAccountCallbackURL } from "@/lib/sign-in-experience";

export default function SignUp() {
	const searchParams = useSearchParams();
	const callbackURL = getAccountCallbackURL(searchParams);
	const hasCreatePrompt = hasSignedOidcCreatePrompt(searchParams);
	const capabilities = useAuthCapabilities();
	const emailOtpReady = capabilities.data?.methods.emailOtp === true;

	return (
		<div className="flex flex-col gap-4">
			{emailOtpReady ? (
				<Button asChild variant="outline" className="relative w-full gap-2">
					<Link
						href={buildPreservedAuthPath(
							"/sign-up/email",
							searchParams,
							callbackURL,
						)}
					>
						<Mail size={16} />
						<span>Continue with Email</span>
					</Link>
				</Button>
			) : null}
			{hasCreatePrompt ? null : (
				<OAuthProviderButtons callbackURL={callbackURL} context="signup" />
			)}
			{!capabilities.isPending &&
			emailOtpReady === false &&
			capabilities.data?.oauthProviders.length === 0 &&
			capabilities.data.oneTap === false ? (
				<p className="text-center text-sm text-body" role="status">
					New account registration is temporarily unavailable.
				</p>
			) : null}
			{!capabilities.isPending && hasCreatePrompt && !emailOtpReady ? (
				<p
					className="rounded-md bg-error-soft px-3 py-2 text-center text-sm leading-6 text-error-deep"
					role="alert"
				>
					This application requires a new account, but secure email sign-up is
					currently unavailable. Return to the application and try again later.
				</p>
			) : null}
			<p className="text-center text-xs leading-5 text-mute">
				By joining, you agree to our{" "}
				<Link
					href="https://www.cinagroup.com/terms"
					className="text-link underline underline-offset-4 hover:text-link-deep"
					target="_blank"
					rel="noopener noreferrer"
				>
					Terms of Service
				</Link>{" "}
				and{" "}
				<Link
					href="https://www.cinagroup.com/privacy"
					className="text-link underline underline-offset-4 hover:text-link-deep"
					target="_blank"
					rel="noopener noreferrer"
				>
					Privacy Policy
				</Link>
			</p>
			<p className="text-center text-sm text-body">
				Already have an account?{" "}
				<Link
					href={buildPreservedAuthPath("/sign-in", searchParams, callbackURL)}
					className="font-medium text-link underline decoration-transparent underline-offset-4 transition-colors hover:text-link-deep hover:decoration-current"
				>
					Log in
				</Link>
			</p>
		</div>
	);
}
