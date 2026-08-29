"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ConsentBtns({ clientName }: { clientName: string }) {
	const [pendingAction, setPendingAction] = useState<
		"authorize" | "cancel" | null
	>(null);

	const submitConsent = async (accept: boolean) => {
		setPendingAction(accept ? "authorize" : "cancel");
		try {
			const response = await authClient.oauth2.consent(
				{ accept },
				{ throw: true },
			);
			if (response.redirect && response.url) {
				window.location.href = response.url;
				return;
			}
			throw new Error("The authorization server did not return a redirect.");
		} catch {
			toast.error(accept ? "Failed to authorize" : "Failed to cancel");
		} finally {
			setPendingAction(null);
		}
	};

	return (
		<div className="grid grid-cols-2 gap-3" aria-busy={pendingAction !== null}>
			<Button
				type="button"
				className="w-full"
				size="lg"
				aria-label={`Allow and continue to ${clientName}`}
				disabled={pendingAction !== null}
				onClick={() => submitConsent(true)}
			>
				{pendingAction === "authorize" ? (
					<>
						<Loader2 size={16} aria-hidden className="animate-spin" />
						Allowing…
					</>
				) : (
					<>
						<span className="sm:hidden">Allow</span>
						<span className="hidden sm:inline">Allow and continue</span>
					</>
				)}
			</Button>
			<Button
				type="button"
				className="w-full"
				size="lg"
				variant="outline"
				aria-label={`Cancel and return to ${clientName}`}
				disabled={pendingAction !== null}
				onClick={() => submitConsent(false)}
			>
				{pendingAction === "cancel" ? (
					<>
						<Loader2 size={16} aria-hidden className="animate-spin" />
						Returning…
					</>
				) : (
					<>
						<span className="sm:hidden">Cancel</span>
						<span className="hidden sm:inline">Cancel and return</span>
					</>
				)}
			</Button>
		</div>
	);
}
