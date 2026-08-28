import { HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { auth } from "@/lib/auth";
import { getReownInitialCookie } from "@/lib/reown-wallet-cookie";
import {
	createSignInCapabilitiesHydrationState,
	loadInitialSignInCapabilities,
} from "./_components/initial-capabilities";
import SignIn from "./_components/sign-in";

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
			title="Sign in or create your account"
			description="Use your email or a trusted provider. If this is your first time, we'll create your account after verification."
			footer={
				<p>
					By continuing, you agree to our{" "}
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
