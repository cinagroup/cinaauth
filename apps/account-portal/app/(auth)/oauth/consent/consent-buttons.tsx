"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export function ConsentBtns() {
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
		<CardFooter
			className="flex items-center gap-2"
			aria-busy={pendingAction !== null}
		>
			<Button
				disabled={pendingAction !== null}
				onClick={() => submitConsent(true)}
			>
				{pendingAction === "authorize" ? (
					<Loader2 size={15} className="animate-spin" />
				) : (
					"Authorize"
				)}
			</Button>
			<Button
				variant="outline"
				disabled={pendingAction !== null}
				onClick={() => submitConsent(false)}
			>
				{pendingAction === "cancel" ? (
					<Loader2 size={15} className="animate-spin" />
				) : (
					"Cancel"
				)}
			</Button>
		</CardFooter>
	);
}
