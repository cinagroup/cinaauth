"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { OAuthProviderButtons } from "@/components/oauth-provider-buttons";
import { Button } from "@/components/ui/button";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";

export default function SignUp() {
	const capabilities = useAuthCapabilities();
	const emailOtpReady = capabilities.data?.methods.emailOtp === true;

	return (
		<div className="flex flex-col gap-3">
			{emailOtpReady ? (
				<Link href="/sign-up/email">
					<Button
						variant="outline"
						className="w-full gap-2 flex relative justify-center"
					>
						<Mail size={16} />
						<span>Continue with Email</span>
					</Button>
				</Link>
			) : null}
			<OAuthProviderButtons callbackURL="/dashboard" context="signup" />
			{!capabilities.isPending &&
			emailOtpReady === false &&
			capabilities.data?.oauthProviders.length === 0 &&
			capabilities.data.oneTap === false ? (
				<p className="text-center text-sm text-body" role="status">
					New account registration is temporarily unavailable.
				</p>
			) : null}
		</div>
	);
}
