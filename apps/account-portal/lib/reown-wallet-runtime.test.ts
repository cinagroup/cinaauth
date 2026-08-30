// @vitest-environment happy-dom

import type { PropsWithChildren } from "react";
import { act, createElement, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => {
	const appKit = {
		close: vi.fn(() => Promise.resolve()),
		open: vi.fn(() => Promise.resolve()),
		setThemeMode: vi.fn(),
		switchNetwork: vi.fn(() => Promise.resolve()),
	};

	return {
		appKit,
		createAppKit: vi.fn(() => appKit),
		resolvedTheme: "light" as string | undefined,
	};
});

vi.mock("@reown/appkit/networks", () => ({ mainnet: { id: 1 } }));
vi.mock("@reown/appkit/react", () => ({
	createAppKit: testState.createAppKit,
}));
vi.mock("@reown/appkit-adapter-wagmi", () => ({
	WagmiAdapter: function WagmiAdapterMock(this: {
		wagmiConfig: Record<string, never>;
	}) {
		this.wagmiConfig = {};
	},
}));
vi.mock("@wagmi/core", () => ({
	cookieStorage: {},
	createStorage: vi.fn(() => ({})),
}));
vi.mock("next-themes", () => ({
	useTheme: () => ({ resolvedTheme: testState.resolvedTheme }),
}));
vi.mock("wagmi", () => ({
	cookieToInitialState: vi.fn(() => undefined),
	useAccount: () => ({
		address: undefined,
		chainId: 1,
		isConnected: true,
	}),
	useSignMessage: () => ({ signMessageAsync: vi.fn() }),
	WagmiProvider: ({ children }: PropsWithChildren) =>
		createElement(Fragment, null, children),
}));
vi.mock("@/lib/cinaauth-siwe-client", () => ({
	cinaAuthSiweProtocolClient: {},
}));
vi.mock("@/lib/reown-appkit-a11y", () => ({
	installReownAppKitA11yShim: vi.fn(() => () => undefined),
}));
vi.mock("@/lib/siwe-wallet-protocol", () => ({
	completeWalletProof: vi.fn(),
}));

import { ReownWalletRuntime } from "@/components/wallet/reown-wallet-runtime";

const runtimeProps = {
	projectId: "test-project-id",
	walletCookie: null,
	purpose: "sign-in" as const,
	getTriggerElement: () => null,
	onBusyChange: vi.fn(),
	onError: vi.fn(),
	onSuccess: vi.fn(),
	fallbackErrorMessage: "Wallet authentication failed.",
};

describe("Reown wallet runtime theme synchronization", () => {
	beforeEach(() => {
		(
			globalThis as typeof globalThis & {
				IS_REACT_ACT_ENVIRONMENT?: boolean;
			}
		).IS_REACT_ACT_ENVIRONMENT = true;
		testState.resolvedTheme = "light";
		testState.createAppKit.mockClear();
		testState.appKit.setThemeMode.mockClear();
		document.documentElement.classList.remove("dark");
	});

	it("syncs theme changes and each reopen through the singleton AppKit API", async () => {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(createElement(ReownWalletRuntime, runtimeProps));
		});

		expect(testState.createAppKit).toHaveBeenCalledTimes(1);
		expect(testState.appKit.setThemeMode).toHaveBeenLastCalledWith("light");

		testState.resolvedTheme = "dark";
		await act(async () => {
			root.render(createElement(ReownWalletRuntime, runtimeProps));
		});

		expect(testState.appKit.setThemeMode).toHaveBeenLastCalledWith("dark");

		await act(async () => {
			root.unmount();
		});

		const reopenedRoot = createRoot(container);
		await act(async () => {
			reopenedRoot.render(createElement(ReownWalletRuntime, runtimeProps));
		});

		expect(testState.createAppKit).toHaveBeenCalledTimes(1);
		expect(testState.appKit.setThemeMode.mock.calls).toEqual([
			["light"],
			["dark"],
			["dark"],
		]);

		await act(async () => {
			reopenedRoot.unmount();
		});
		container.remove();
	});
});
