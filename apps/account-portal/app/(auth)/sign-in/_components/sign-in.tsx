"use client";

import { Key, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { OAuthProviderButtons } from "@/components/oauth-provider-buttons";
import { Button } from "@/components/ui/button";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { authClient } from "@/lib/auth-client";
import {
	buildPreservedAuthPath,
	hasSignedOidcAuthorizationQuery,
} from "@/lib/oidc-navigation";

export default function SignIn() {
	const searchParams = useSearchParams();
	const callbackURL = searchParams.get("callbackURL") ?? "/dashboard";
	const hasOidcQuery = hasSignedOidcAuthorizationQuery(searchParams);
	const capabilities = useAuthCapabilities();
	const emailOtpReady = capabilities.data?.methods.emailOtp === true;

	return (
		<div className="flex flex-col gap-3">
			{emailOtpReady ? (
				<Link
					href={buildPreservedAuthPath(
						"/sign-in/email",
						searchParams,
						callbackURL,
					)}
				>
					<Button
						variant="outline"
						className="w-full gap-2 flex relative justify-center"
					>
						<Mail size={16} />
						<span>Continue with Email</span>
					</Button>
				</Link>
			) : null}

			<Link
				href={buildPreservedAuthPath(
					"/sign-in/password",
					searchParams,
					callbackURL,
				)}
			>
				<Button
					variant="outline"
					className="w-full gap-2 flex relative justify-center"
				>
					<LockKeyhole size={16} />
					<span>Continue with Password</span>
				</Button>
			</Link>

			<OAuthProviderButtons callbackURL={callbackURL} />

			<Button
				variant="outline"
				className="w-full gap-2 flex relative justify-center"
				onClick={() =>
					authClient.signIn.passkey({
						fetchOptions: {
							onSuccess() {
								toast.success("Successfully signed in");
								if (!hasOidcQuery) window.location.href = callbackURL;
							},
							onError(context) {
								toast.error(`Authentication failed: ${context.error.message}`);
							},
						},
					})
				}
			>
				<Key size={16} />
				<span>Continue with Passkey</span>
			</Button>
		</div>
	);
}
