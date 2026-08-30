"use client";

import { mainnet } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createStorage } from "@wagmi/core";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import {
	cookieToInitialState,
	useAccount,
	useSignMessage,
	WagmiProvider,
} from "wagmi";
import { cinaAuthSiweProtocolClient } from "@/lib/cinaauth-siwe-client";
import { installReownAppKitA11yShim } from "@/lib/reown-appkit-a11y";
import type { WalletProofPurpose } from "@/lib/siwe-wallet-protocol";
import { completeWalletProof } from "@/lib/siwe-wallet-protocol";

const networks = [mainnet] satisfies [typeof mainnet];

type ReownRuntime = {
	appKit: ReturnType<typeof createAppKit>;
	wagmiAdapter: WagmiAdapter;
};

let runtime: ReownRuntime | undefined;

type ReownThemeMode = "dark" | "light";

const getDocumentThemeMode = (): ReownThemeMode =>
	typeof document !== "undefined" &&
	document.documentElement.classList.contains("dark")
		? "dark"
		: "light";

const getReownRuntime = (projectId: string, themeMode: ReownThemeMode) => {
	if (runtime) return runtime;
	const wagmiAdapter = new WagmiAdapter({
		storage: createStorage({ storage: cookieStorage }),
		ssr: true,
		projectId,
		networks,
	});
	const origin = window.location.origin;
	const appKit = createAppKit({
		adapters: [wagmiAdapter],
		projectId,
		networks,
		defaultNetwork: mainnet,
		allowUnsupportedChain: false,
		coinbasePreference: "eoaOnly",
		defaultAccountTypes: { eip155: "eoa" },
		enableBaseAccount: false,
		enableAuthLogger: false,
		enableWalletGuide: false,
		metadata: {
			name: "CinaSeek Accounts",
			description: "Secure wallet access for your CinaSeek account.",
			url: origin,
			icons: [new URL("/favicon/apple-touch-icon.png", origin).toString()],
		},
		themeMode,
		features: {
			analytics: false,
			email: false,
			socials: false,
			swaps: false,
			onramp: false,
			receive: false,
			send: false,
			history: false,
			smartSessions: false,
			pay: false,
			reownAuthentication: false,
		},
	});
	runtime = { appKit, wagmiAdapter };
	return runtime;
};

const getErrorMessage = (error: unknown, fallback: string) => {
	const message =
		error instanceof Error && error.message
			? error.message
			: error &&
					typeof error === "object" &&
					"message" in error &&
					typeof error.message === "string"
				? error.message
				: fallback;
	return message.length <= 256
		? message
		: fallback;
};

type WalletControllerProps = {
	runtime: ReownRuntime;
	themeMode: ReownThemeMode;
	purpose: WalletProofPurpose;
	getTriggerElement: () => HTMLElement | null;
	onBusyChange: (busy: boolean) => void;
	onError: (message: string) => void;
	onSuccess: () => void | Promise<void>;
	fallbackErrorMessage: string;
};

function WalletController({
	runtime,
	themeMode,
	purpose,
	getTriggerElement,
	onBusyChange,
	onError,
	onSuccess,
	fallbackErrorMessage,
}: WalletControllerProps) {
	const account = useAccount();
	const { signMessageAsync } = useSignMessage();
	const proofStarted = useRef(false);
	const networkSwitchPending = useRef(false);

	useEffect(() => {
		runtime.appKit.setThemeMode(themeMode);
	}, [runtime, themeMode]);

	useEffect(
		() =>
			installReownAppKitA11yShim({
				appKit: runtime.appKit,
				getTriggerElement,
			}),
		[getTriggerElement, runtime],
	);

	useEffect(() => {
		if (account.isConnected) return;
		void runtime.appKit.open({ view: "Connect" }).catch((error: unknown) => {
			onError(getErrorMessage(error, fallbackErrorMessage));
		});
	}, [account.isConnected, fallbackErrorMessage, onError, runtime]);

	useEffect(() => {
		if (
			!account.isConnected ||
			account.chainId === undefined ||
			account.chainId === mainnet.id ||
			networkSwitchPending.current
		) {
			return;
		}
		networkSwitchPending.current = true;
		void runtime.appKit
			.switchNetwork(mainnet)
			.catch((error: unknown) => {
				onError(getErrorMessage(error, fallbackErrorMessage));
			})
			.finally(() => {
				networkSwitchPending.current = false;
			});
	}, [
		account.chainId,
		account.isConnected,
		fallbackErrorMessage,
		onError,
		runtime,
	]);

	useEffect(() => {
		if (
			!account.isConnected ||
			!account.address ||
			account.chainId === undefined ||
			account.chainId !== mainnet.id ||
			proofStarted.current
		) {
			return;
		}
		proofStarted.current = true;
		onBusyChange(true);
		void completeWalletProof({
			client: cinaAuthSiweProtocolClient,
			purpose,
			walletAddress: account.address,
			chainId: account.chainId,
			signMessage: (message) =>
				signMessageAsync({ message, account: account.address }),
		})
			.then(async () => {
				await runtime.appKit.close().catch(() => undefined);
				await onSuccess();
			})
			.catch((error: unknown) => {
				onError(getErrorMessage(error, fallbackErrorMessage));
			})
			.finally(() => {
				onBusyChange(false);
			});
	}, [
		account.address,
		account.chainId,
		account.isConnected,
		fallbackErrorMessage,
		onBusyChange,
		onError,
		onSuccess,
		purpose,
		runtime,
		signMessageAsync,
	]);

	return null;
}

type ReownWalletRuntimeProps = {
	projectId: string;
	walletCookie: string | null;
	purpose: WalletProofPurpose;
	getTriggerElement: () => HTMLElement | null;
	onBusyChange: (busy: boolean) => void;
	onError: (message: string) => void;
	onSuccess: () => void | Promise<void>;
	fallbackErrorMessage: string;
};

export function ReownWalletRuntime({
	projectId,
	walletCookie,
	purpose,
	getTriggerElement,
	onBusyChange,
	onError,
	onSuccess,
	fallbackErrorMessage,
}: ReownWalletRuntimeProps) {
	const { resolvedTheme } = useTheme();
	const themeMode =
		resolvedTheme === "dark" || resolvedTheme === "light"
			? resolvedTheme
			: getDocumentThemeMode();
	const activeRuntime = getReownRuntime(projectId, themeMode);
	const initialState = cookieToInitialState(
		activeRuntime.wagmiAdapter.wagmiConfig,
		walletCookie,
	);

	return (
		<WagmiProvider
			config={activeRuntime.wagmiAdapter.wagmiConfig}
			initialState={initialState}
		>
			<WalletController
				runtime={activeRuntime}
				themeMode={themeMode}
				purpose={purpose}
				getTriggerElement={getTriggerElement}
				onBusyChange={onBusyChange}
				fallbackErrorMessage={fallbackErrorMessage}
				onError={onError}
				onSuccess={onSuccess}
			/>
		</WagmiProvider>
	);
}
