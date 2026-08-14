"use client";

import { Github, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
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
	const googleButtonMeasureRef = useRef<HTMLDivElement>(null);
	const googleButtonRef = useRef<HTMLDivElement>(null);
	const [googleButtonWidth, setGoogleButtonWidth] = useState<number>();
	const { data } = useAuthCapabilities();
	const providers = data?.oauthProviders ?? [];
	const oneTapReady = isOneTapClientReady(data, googleClientId);
	const visibleProviders = providers.filter(
		(provider) =>
			!(oneTapReady && provider.type === "social" && provider.id === "google"),
	);

	useEffect(() => {
		const container = googleButtonMeasureRef.current;
		if (!oneTapReady || !container) return;

		const updateWidth = () => {
			const nextWidth = Math.min(Math.round(container.clientWidth), 400);
			if (nextWidth > 0) {
				setGoogleButtonWidth((currentWidth) =>
					currentWidth === nextWidth ? currentWidth : nextWidth,
				);
			}
		};
		updateWidth();
		const observer = new ResizeObserver(updateWidth);
		observer.observe(container);
		return () => observer.disconnect();
	}, [oneTapReady]);

	useEffect(() => {
		const container = googleButtonRef.current;
		if (!oneTapReady || !container || !googleButtonWidth) return;
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
					width: googleButtonWidth,
				},
			},
			fetchOptions: {
				onError(error) {
					toast.error(error.error.message || "Google authentication failed");
				},
			},
		});
		return () => container.replaceChildren();
	}, [callbackURL, context, googleButtonWidth, oneTapReady]);

	if (visibleProviders.length === 0 && !oneTapReady) return null;

	return (
		<>
			<FieldSeparator>Or</FieldSeparator>
			{oneTapReady ? (
				<div
					ref={googleButtonMeasureRef}
					className="flex min-h-12 w-full items-center justify-center overflow-hidden"
					aria-label={
						context === "signup"
							? "Sign up with Google"
							: "Continue with Google"
					}
				>
					<div
						key={googleButtonWidth ?? "pending"}
						ref={googleButtonRef}
						className="flex w-full items-center justify-center"
					/>
				</div>
			) : null}
			{visibleProviders.map((provider) => (
				<Button
					key={provider.id}
					type="button"
					variant="outline"
					size="lg"
					className="relative flex h-auto min-h-12 w-full justify-center whitespace-normal px-3 py-3 text-center"
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
						<Github data-icon="inline-start" aria-hidden />
					) : (
						<KeyRound data-icon="inline-start" aria-hidden />
					)}
					<span>Continue with {formatOAuthProviderName(provider.id)}</span>
				</Button>
			))}
		</>
	);
}
