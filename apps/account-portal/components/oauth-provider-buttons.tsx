"use client";

import { Github, KeyRound } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import {
	formatOAuthProviderName,
	isOneTapClientReady,
} from "@/lib/auth-capabilities";
import { authClient } from "@/lib/auth-client";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function OAuthProviderButtons({
	callbackURL,
	context = "signin",
}: {
	callbackURL: string;
	context?: "signin" | "signup";
}) {
	const googleButtonRef = useRef<HTMLDivElement>(null);
	const { data } = useAuthCapabilities();
	const providers = data?.oauthProviders ?? [];
	const oneTapReady = isOneTapClientReady(data, googleClientId);
	const visibleProviders = providers.filter(
		(provider) =>
			!(oneTapReady && provider.type === "social" && provider.id === "google"),
	);

	useEffect(() => {
		const container = googleButtonRef.current;
		if (!oneTapReady || !container) return;
		container.replaceChildren();
		void authClient.oneTap({
			callbackURL,
			context,
			button: {
				container,
				config: {
					type: "standard",
					theme: "outline",
					size: "large",
					shape: "rectangular",
					text: context === "signup" ? "signup_with" : "continue_with",
					width: Math.min(container.clientWidth || 320, 400),
				},
			},
			fetchOptions: {
				onError(error) {
					toast.error(error.error.message || "Google authentication failed");
				},
			},
		});
		return () => container.replaceChildren();
	}, [callbackURL, context, oneTapReady]);

	if (visibleProviders.length === 0 && !oneTapReady) return null;

	return (
		<>
			<div className="relative my-1 flex items-center" role="separator">
				<div className="flex-grow border-t border-border" />
				<span className="mx-4 flex-shrink text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
					Or use a connected account
				</span>
				<div className="flex-grow border-t border-border" />
			</div>
			{oneTapReady ? (
				<div
					ref={googleButtonRef}
					className="flex min-h-10 w-full items-center justify-center overflow-hidden"
					aria-label={
						context === "signup"
							? "Sign up with Google"
							: "Continue with Google"
					}
				/>
			) : null}
			{visibleProviders.map((provider) => (
				<Button
					key={provider.id}
					type="button"
					variant="outline"
					className="relative flex w-full justify-center gap-2"
					onClick={() => {
						if (provider.type === "social") {
							void authClient.signIn.social({
								provider: provider.id,
								callbackURL,
							});
							return;
						}
						void authClient.signIn.oauth2({
							providerId: provider.id,
							callbackURL,
						});
					}}
				>
					{provider.id === "github" ? (
						<Github size={17} aria-hidden />
					) : (
						<KeyRound size={17} aria-hidden />
					)}
					<span>Continue with {formatOAuthProviderName(provider.id)}</span>
				</Button>
			))}
		</>
	);
}
