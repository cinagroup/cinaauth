"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordSignInForm } from "@/components/forms/password-sign-in-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { getAccountCallbackURL } from "@/lib/sign-in-experience";

export default function PasswordSignInPage() {
	const searchParams = useSearchParams();
	const capabilities = useAuthCapabilities();
	const callbackURL = getAccountCallbackURL(searchParams);
	const query = searchParams.toString();
	const backHref = `/sign-in${query ? `?${query}` : ""}`;

	return (
		<AuthShell
			title="Sign in with password"
			description="Use an existing email and password account. New accounts continue through verified email, OAuth, or wallet sign-in."
			backHref={backHref}
		>
			{capabilities.isPending ? (
				<p
					role="status"
					className="flex items-center justify-center gap-2 py-8 text-sm text-body"
				>
					<LoaderCircle
						className="motion-safe:animate-spin"
						size={16}
						aria-hidden
					/>
					Checking password sign-in availability…
				</p>
			) : capabilities.data?.methods.emailPassword === true ? (
				<PasswordSignInForm callbackURL={callbackURL} params={searchParams} />
			) : (
				<Alert className="border-error/20 bg-error-soft text-error-deep">
					<AlertCircle aria-hidden />
					<AlertTitle>Password sign-in is unavailable</AlertTitle>
					<AlertDescription className="text-error-deep">
						Choose another enabled method from the main sign-in page.
					</AlertDescription>
				</Alert>
			)}
		</AuthShell>
	);
}
