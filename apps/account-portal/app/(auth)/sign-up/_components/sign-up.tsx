"use client";

import { AlertCircle, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OAuthProviderButtons } from "@/components/oauth-provider-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { isOneTapClientReady } from "@/lib/auth-capabilities";
import {
	buildPreservedAuthPath,
	hasSignedOidcCreatePrompt,
} from "@/lib/oidc-navigation";
import { getAccountCallbackURL } from "@/lib/sign-in-experience";
import { getSignUpAvailability } from "./sign-up-state";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function SignUp() {
	const searchParams = useSearchParams();
	const callbackURL = getAccountCallbackURL(searchParams);
	const hasCreatePrompt = hasSignedOidcCreatePrompt(searchParams);
	const capabilities = useAuthCapabilities();
	const emailOtpReady = capabilities.data?.methods.emailOtp === true;
	const oauthReady =
		(capabilities.data?.oauthProviders.length ?? 0) > 0 ||
		isOneTapClientReady(capabilities.data, googleClientId);
	const availability = getSignUpAvailability({
		isPending: capabilities.isPending,
		isError: capabilities.isError,
		hasCreatePrompt,
		emailOtpReady,
		oauthReady,
	});

	return (
		<div className="flex flex-col gap-4">
			{availability.kind === "pending" ? (
				<div className="grid gap-3" role="status" aria-live="polite">
					<p className="flex items-center justify-center gap-2 text-sm text-body">
						<LoaderCircle
							size={16}
							className="motion-safe:animate-spin"
							aria-hidden
						/>
						Checking available sign-up methods...
					</p>
					<Skeleton className="h-12 w-full" aria-hidden />
					<Skeleton className="h-12 w-full" aria-hidden />
				</div>
			) : null}

			{availability.kind === "error" ? (
				<Alert className="border-error/20 bg-error-soft text-error-deep">
					<AlertCircle aria-hidden />
					<AlertTitle className="line-clamp-none">
						We couldn't load sign-up methods
					</AlertTitle>
					<AlertDescription className="text-error-deep">
						Check your connection, then try again. No registration method was
						assumed to be available.
					</AlertDescription>
					<Button
						type="button"
						variant="outline"
						className="mt-4 w-full"
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

			{availability.kind === "ready" && availability.showEmailOtp ? (
				<Button
					asChild
					variant="outline"
					size="lg"
					className="relative h-auto min-h-12 w-full gap-2 whitespace-normal px-3 py-3 text-center"
				>
					<Link
						href={buildPreservedAuthPath(
							"/sign-up/email",
							searchParams,
							callbackURL,
						)}
					>
						<Mail data-icon="inline-start" aria-hidden />
						<span>Continue with Email</span>
					</Link>
				</Button>
			) : null}
			{availability.kind === "ready" && availability.showOAuth ? (
				<OAuthProviderButtons callbackURL={callbackURL} context="signup" />
			) : null}

			{availability.kind === "create-unavailable" ? (
				<Alert className="border-error/20 bg-error-soft text-error-deep">
					<AlertCircle aria-hidden />
					<AlertTitle className="line-clamp-none">
						This application requires a new account
					</AlertTitle>
					<AlertDescription className="text-error-deep">
						Secure email sign-up isn't available for this account service.
						Return to the application to choose another next step.
					</AlertDescription>
				</Alert>
			) : null}

			{availability.kind === "unavailable" ? (
				<Alert
					role="status"
					className="rounded-md border border-hairline bg-canvas-soft-2 px-4 py-4 text-body"
					aria-live="polite"
				>
					<ShieldCheck aria-hidden />
					<AlertTitle className="line-clamp-none text-ink">
						New account registration isn't available right now
					</AlertTitle>
					<AlertDescription>
						No sign-up method is currently enabled for this account service.
					</AlertDescription>
				</Alert>
			) : null}

			<p className="text-center text-xs leading-5 text-body">
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
