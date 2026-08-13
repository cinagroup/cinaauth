"use client";

import {
	AlertCircle,
	KeyRound,
	LoaderCircle,
	LockKeyhole,
	Mail,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { OAuthProviderButtons } from "@/components/oauth-provider-buttons";
import { Button } from "@/components/ui/button";
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

export default function SignIn() {
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
				<div
					role="status"
					className="flex items-start gap-3 rounded-md border border-link/20 bg-canvas-soft-2 px-3 py-3 text-body"
				>
					<ShieldCheck
						className="mt-0.5 shrink-0 text-link"
						size={18}
						aria-hidden
					/>
					<div>
						<p className="text-sm font-medium">Identity check required</p>
						<p className="mt-0.5 text-xs leading-5">{stepUpNotice}</p>
					</div>
				</div>
			) : null}

			{alert ? (
				<div
					role="alert"
					className="flex items-start gap-3 rounded-md border border-error/20 bg-error-soft px-3 py-3 text-error-deep"
				>
					<AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden />
					<div>
						<p className="text-sm font-medium">{alert.title}</p>
						<p className="mt-0.5 text-xs leading-5">{alert.description}</p>
					</div>
				</div>
			) : null}

			{contextMessage ? (
				<div className="flex items-start gap-3 rounded-md bg-canvas-soft-2 px-3 py-3 text-body">
					<ShieldCheck
						className="mt-0.5 shrink-0 text-link"
						size={18}
						aria-hidden
					/>
					<p className="text-xs leading-5">{contextMessage}</p>
				</div>
			) : null}

			<div
				className="flex flex-col gap-3"
				aria-label="CinaSeek sign-in methods"
			>
				<Button asChild variant="outline" className="relative w-full gap-2">
					<Link
						href={buildPreservedAuthPath(
							"/sign-in/password",
							searchParams,
							callbackURL,
						)}
					>
						<LockKeyhole size={17} aria-hidden />
						<span>Continue with password</span>
					</Link>
				</Button>

				<Button
					type="button"
					variant="outline"
					className="relative w-full gap-2"
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
					<KeyRound size={17} aria-hidden />
					<span>Continue with passkey</span>
				</Button>
			</div>

			{capabilities.isPending ? (
				<p
					className="flex items-center justify-center gap-2 text-xs text-mute"
					role="status"
				>
					<LoaderCircle
						size={14}
						className="motion-safe:animate-spin"
						aria-hidden
					/>
					Checking additional sign-in methods…
				</p>
			) : null}

			{emailOtpReady ? (
				<Button asChild variant="outline" className="relative w-full gap-2">
					<Link
						href={buildPreservedAuthPath(
							"/sign-in/email",
							searchParams,
							callbackURL,
						)}
					>
						<Mail size={17} aria-hidden />
						<span>Email me a sign-in code</span>
					</Link>
				</Button>
			) : null}

			{signInPolicy.allowFederatedProviders ? (
				<OAuthProviderButtons callbackURL={callbackURL} />
			) : (
				<p className="rounded-md bg-canvas-soft-2 px-3 py-2 text-center text-xs leading-5 text-mute">
					Automatic and social sign-in are unavailable for this identity check.
					Use your password, passkey, or email code.
				</p>
			)}

			<p className="text-center text-[11px] leading-5 text-mute">
				Use only a device you trust. CinaSeek never asks for your password
				outside accounts.cinaseek.ai.
			</p>
		</div>
	);
}
