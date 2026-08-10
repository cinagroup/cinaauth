"use client";

import { KeyRound } from "lucide-react";
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
			<div className="relative flex items-center my-2">
				<div className="flex-grow border-t border-border" />
				<span className="flex-shrink mx-4 text-xs text-muted-foreground">
					or
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
					variant="outline"
					className="w-full gap-2 flex relative justify-center"
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
					<KeyRound size={16} />
					<span>Continue with {formatOAuthProviderName(provider.id)}</span>
				</Button>
			))}
		</>
	);
}
