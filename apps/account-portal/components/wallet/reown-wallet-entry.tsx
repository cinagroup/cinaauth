"use client";

import type { AuthCapabilities } from "@cinaauth/auth-web-contract";
import { WalletCards } from "lucide-react";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { dashboardMessages } from "@/lib/dashboard-i18n";
import {
	isReownWalletReady,
	normalizeReownProjectId,
} from "@/lib/reown-wallet-gate";
import type { WalletProofPurpose } from "@/lib/siwe-wallet-protocol";

const ReownWalletRuntime = lazy(() =>
	import("./reown-wallet-runtime").then((module) => ({
		default: module.ReownWalletRuntime,
	})),
);

type ReownWalletEntryProps = {
	capabilities: AuthCapabilities | undefined;
	walletCookie: string | null;
	purpose: WalletProofPurpose;
	label: string;
	disabled?: boolean;
	className?: string;
	variant?: "default" | "outline";
	onSuccess?: () => void | Promise<void>;
};

/** A small gate that loads the wallet SDK only after an explicit user action. */
export function ReownWalletEntry({
	capabilities,
	walletCookie,
	purpose,
	label,
	disabled = false,
	className,
	variant = "outline",
	onSuccess,
}: ReownWalletEntryProps) {
	const { locale, messages } = useI18n();
	const accountMessages = dashboardMessages[locale];
	const projectId = normalizeReownProjectId(
		process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
	);
	const [activation, setActivation] = useState(0);
	const [proofPending, setProofPending] = useState(false);
	const triggerElement = useRef<HTMLButtonElement | null>(null);
	const ready = isReownWalletReady(
		capabilities,
		process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
		process.env.NEXT_PUBLIC_SIWE_WALLET_UI_ENABLED,
	);

	const handleSuccess = useCallback(async () => {
		toast.success(
			purpose === "sign-in"
				? messages.signedInSuccessfully
				: accountMessages.walletConnected,
		);
		await onSuccess?.();
	}, [
		accountMessages.walletConnected,
		messages.signedInSuccessfully,
		onSuccess,
		purpose,
	]);

	const handleError = useCallback((message: string) => {
		toast.error(message);
	}, []);
	const getTriggerElement = useCallback(() => triggerElement.current, []);

	if (!ready || !projectId) return null;

	return (
		<>
			<Button
				type="button"
				variant={variant}
				size="lg"
				className={className}
				disabled={disabled || proofPending}
				onClick={(event) => {
					triggerElement.current = event.currentTarget;
					setActivation((current) => current + 1);
				}}
			>
				<WalletCards data-icon="inline-start" aria-hidden />
				{proofPending ? messages.waitingForWallet : label}
			</Button>
			{activation > 0 ? (
				<Suspense fallback={null}>
					<ReownWalletRuntime
						key={activation}
						projectId={projectId}
						walletCookie={walletCookie}
						purpose={purpose}
						getTriggerElement={getTriggerElement}
						onBusyChange={setProofPending}
						fallbackErrorMessage={messages.walletAuthenticationFailed}
						onError={handleError}
						onSuccess={handleSuccess}
					/>
				</Suspense>
			) : null}
		</>
	);
}
