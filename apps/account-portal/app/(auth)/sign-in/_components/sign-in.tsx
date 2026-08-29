"use client";

import { AlertCircle, LoaderCircle, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { EmailOtpForm } from "@/components/forms/email-otp-form";
import { OAuthProviderButtons } from "@/components/oauth-provider-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ReownWalletEntry } from "@/components/wallet/reown-wallet-entry";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { authClient } from "@/lib/auth-client";
import {
	getAccountSignInPolicy,
	getAccountStepUpNotice,
} from "@/lib/client-api";
import { completeEmailOtpAuthentication } from "@/lib/email-otp-flow";
import {
	hasSignedOidcAuthorizationQuery,
	hasSignedOidcCreatePrompt,
} from "@/lib/oidc-navigation";
import {
	getAccountCallbackURL,
	getSignInAlert,
} from "@/lib/sign-in-experience";

export default function SignIn({
	walletCookie,
}: {
	walletCookie: string | null;
}) {
	const searchParams = useSearchParams();
	const callbackURL = getAccountCallbackURL(searchParams);
	const hasOidcQuery = hasSignedOidcAuthorizationQuery(searchParams);
	const hasCreatePrompt = hasSignedOidcCreatePrompt(searchParams);
	const capabilities = useAuthCapabilities();
	const emailOtpReady = capabilities.data?.methods.emailOtp === true;
	const alert = getSignInAlert(searchParams.get("error"));
	const mode = searchParams.get("mode");
	const signInPolicy = getAccountSignInPolicy(mode);
	const stepUpNotice = getAccountStepUpNotice(mode);
	const allowFederatedProviders =
		signInPolicy.allowFederatedProviders && !hasCreatePrompt;

	return (
		<div className="flex flex-col gap-5">
			{stepUpNotice ? (
				<Alert
					role="status"
					aria-live="polite"
					className="border-link/20 bg-canvas-soft-2 text-body"
				>
					<ShieldCheck className="text-link" aria-hidden />
					<AlertTitle>Identity check required</AlertTitle>
					<AlertDescription>{stepUpNotice}</AlertDescription>
				</Alert>
			) : null}

			{alert ? (
				<Alert className="border-error/20 bg-error-soft text-error-deep">
					<AlertCircle aria-hidden />
					<AlertTitle>{alert.title}</AlertTitle>
					<AlertDescription className="text-error-deep">
						{alert.description}
					</AlertDescription>
				</Alert>
			) : null}

			<EmailOtpForm
				intent={hasCreatePrompt ? "signup" : "signin"}
				suppressAutomaticRedirect={hasCreatePrompt}
				onSuccess={async () => {
					await completeEmailOtpAuthentication({
						params: searchParams,
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

			{allowFederatedProviders ? (
				<div className="flex flex-col gap-3" aria-label="Other sign-in methods">
					<ReownWalletEntry
						capabilities={capabilities.data}
						walletCookie={walletCookie}
						purpose="sign-in"
						label="Continue with wallet"
						className="relative h-auto min-h-12 w-full whitespace-normal px-3 py-3 text-center"
						onSuccess={() => {
							if (!hasOidcQuery) window.location.href = callbackURL;
						}}
					/>
					{capabilities.data?.methods.siwe === true ? (
						<p className="text-center text-xs leading-5 text-body">
							New wallet? We'll create your account after you verify the
							signature.
						</p>
					) : null}
				</div>
			) : null}

			{capabilities.isPending ? (
				<p
					className="flex items-center justify-center gap-2 text-xs text-body"
					role="status"
				>
					<LoaderCircle
						className="motion-safe:animate-spin"
						size={16}
						aria-hidden
					/>
					Checking additional sign-in methods…
				</p>
			) : null}

			{capabilities.isError ? (
				<Alert className="border-error/20 bg-error-soft text-error-deep">
					<AlertCircle aria-hidden />
					<AlertTitle className="line-clamp-none">
						Secure sign-in configuration could not be loaded
					</AlertTitle>
					<AlertDescription className="text-error-deep">
						Email code sign-in stays unavailable until the security
						configuration can be verified.
					</AlertDescription>
					<Button
						type="button"
						variant="outline"
						className="mt-3 w-full"
						disabled={capabilities.isFetching}
						onClick={() => void capabilities.refetch()}
					>
						{capabilities.isFetching ? (
							<LoaderCircle
								data-icon="inline-start"
								className="motion-safe:animate-spin"
								aria-hidden
							/>
						) : null}
						Try again
					</Button>
				</Alert>
			) : null}

			{allowFederatedProviders ? (
				<OAuthProviderButtons callbackURL={callbackURL} />
			) : !hasCreatePrompt ? (
				<p className="rounded-md bg-canvas-soft-2 px-3 py-2 text-center text-xs leading-5 text-body">
					Automatic and social sign-in are unavailable for this identity check.
					{emailOtpReady
						? " Request an email code to continue."
						: " No eligible sign-in method is currently available."}
				</p>
			) : null}
		</div>
	);
}
