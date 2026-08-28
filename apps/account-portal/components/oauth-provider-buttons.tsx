"use client";

import { Github, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
import { useAuthCapabilities } from "@/hooks/use-auth-capabilities";
import { formatOAuthProviderName } from "@/lib/auth-capabilities";
import { authClient } from "@/lib/auth-client";

export function OAuthProviderButtons({
	callbackURL,
}: {
	/**
	 * Post-login destination. Leave undefined during a signed OIDC
	 * authorization so the server-provided continuation URL (back to the
	 * relying party) wins over a local default such as /dashboard.
	 */
	callbackURL?: string;
}) {
	const { data } = useAuthCapabilities();
	const providers = data?.oauthProviders ?? [];

	if (providers.length === 0) return null;

	return (
		<>
			<FieldSeparator>Or</FieldSeparator>
			{providers.map((provider) => (
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
