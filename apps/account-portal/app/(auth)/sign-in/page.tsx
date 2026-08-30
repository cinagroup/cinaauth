import { HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { SignInPageShell } from "@/components/auth/sign-in-page-shell";
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
		<SignInPageShell>
			<SignInWithCapabilities />
		</SignInPageShell>
	);
}
