import { HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { auth } from "@/lib/auth";
import { getReownInitialCookie } from "@/lib/reown-wallet-cookie";
import {
	createSignInCapabilitiesHydrationState,
	loadInitialSignInCapabilities,
} from "./_components/initial-capabilities";
import SignIn from "./_components/sign-in";
import { SignUpLink } from "./_components/sign-up-link";

export const dynamic = "force-dynamic";

async function SignInWithCapabilities() {
	const [initialCapabilities, requestHeaders] = await Promise.all([
		loadInitialSignInCapabilities(() => auth.api.getCapabilities()),
		headers(),
	]);
	const walletCookie = getReownInitialCookie(requestHeaders.get("cookie"));
	if (!initialCapabilities) return <SignIn walletCookie={walletCookie} />;
	const hydrationState =
		createSignInCapabilitiesHydrationState(initialCapabilities);

	return (
		<HydrationBoundary state={hydrationState}>
			<SignIn walletCookie={walletCookie} />
		</HydrationBoundary>
	);
}

export default function Page() {
	return (
		<AuthShell
			title="Sign in to CinaSeek"
			footer={
				<Suspense fallback="New to CinaSeek? Create an account">
					<SignUpLink />
				</Suspense>
			}
		>
			<Suspense
				fallback={
					<p className="py-8 text-center text-sm text-body" role="status">
						Loading secure sign-in options…
					</p>
				}
			>
				<SignInWithCapabilities />
			</Suspense>
		</AuthShell>
	);
}
