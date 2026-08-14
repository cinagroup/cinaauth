"use client";

import {
	AlertCircle,
	KeyRound,
	LoaderCircle,
	Mail,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SignInForm } from "@/components/forms/sign-in-form";
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
import {
	buildPreservedAuthPath,
	hasSignedOidcAuthorizationQuery,
} from "@/lib/oidc-navigation";
import {
	getAccountCallbackURL,
	getSignInAlert,
	getSignInContextMessage,
} from "@/lib/sign-in-experience";

export default function SignIn({
	walletCookie,
}: {
	walletCookie: string | null;
}) {
	const searchParams = useSearchParams();
	const callbackURL = getAccountCallbackURL(searchParams);
	const hasOidcQuery = hasSignedOidcAuthorizationQuery(searchParams);
	const capabilities = useAuthCapabilities();
	const emailOtpReady = capabilities.data?.methods.emailOtp === true;
	const alert = getSignInAlert(searchParams.get("error"));
	const contextMessage = getSignInContextMessage(hasOidcQuery);
	const mode = searchParams.get("mode");
	const signInPolicy = getAccountSignInPolicy(mode);
	const stepUpNotice = getAccountStepUpNotice(mode);

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

			{contextMessage ? (
				<Alert
					role="status"
					aria-live="polite"
					className="border-transparent bg-canvas-soft-2 text-body"
				>
					<ShieldCheck className="text-link" aria-hidden />
					<AlertDescription>{contextMessage}</AlertDescription>
				</Alert>
			) : null}

			<SignInForm
				callbackURL={callbackURL}
				showPasswordToggle
				onSuccess={() => {
					if (!hasOidcQuery) window.location.href = callbackURL;
				}}
			/>

			<div className="flex flex-col gap-3" aria-label="Other sign-in methods">
				<Button
					type="button"
					variant="outline"
					size="lg"
					className="relative h-auto min-h-12 w-full whitespace-normal px-3 py-3 text-center"
					onClick={() =>
						authClient.signIn.passkey({
							fetchOptions: {
								onSuccess() {
									toast.success("Successfully signed in");
									if (!hasOidcQuery) window.location.href = callbackURL;
								},
								onError(context) {
									toast.error(
										`Authentication failed: ${context.error.message}`,
									);
								},
							},
						})
					}
				>
					<KeyRound data-icon="inline-start" aria-hidden />
					<span>Continue with passkey</span>
				</Button>

				{signInPolicy.allowFederatedProviders ? (
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
				) : null}

				{emailOtpReady ? (
					<Button
						asChild
						variant="outline"
						size="lg"
						className="relative h-auto min-h-12 w-full whitespace-normal px-3 py-3 text-center"
					>
						<Link
							href={buildPreservedAuthPath(
								"/sign-in/email",
								searchParams,
								callbackURL,
							)}
						>
							<Mail data-icon="inline-start" aria-hidden />
							<span>Email me a sign-in code</span>
						</Link>
					</Button>
				) : null}
			</div>

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
						Password sign-in stays unavailable until the security configuration
						can be verified.
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

			{signInPolicy.allowFederatedProviders ? (
				<OAuthProviderButtons callbackURL={callbackURL} />
			) : (
				<p className="rounded-md bg-canvas-soft-2 px-3 py-2 text-center text-xs leading-5 text-body">
					Automatic and social sign-in are unavailable for this identity check.
					Use your password or passkey
					{emailOtpReady ? ", or request an email code." : "."}
				</p>
			)}

			<p className="text-center text-[11px] leading-5 text-body">
				Use only a device you trust. CinaSeek never asks for your password
				outside accounts.cinaseek.ai.
			</p>
		</div>
	);
}
