import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("Reown wallet bundle boundary", () => {
	it("keeps Reown and Wagmi out of the lightweight entry module", () => {
		const entry = readSource("../components/wallet/reown-wallet-entry.tsx");

		expect(entry).toContain('import("./reown-wallet-runtime")');
		expect(entry).not.toMatch(/from ["']@reown\//);
		expect(entry).not.toMatch(/from ["']wagmi/);
		expect(entry).toContain("NEXT_PUBLIC_REOWN_PROJECT_ID");
		expect(entry).toContain("NEXT_PUBLIC_SIWE_WALLET_UI_ENABLED");
		expect(entry).toContain("isReownWalletReady");
	});

	it("disables non-wallet Reown product surfaces", () => {
		const runtime = readSource("../components/wallet/reown-wallet-runtime.tsx");

		expect(runtime).toContain("analytics: false");
		expect(runtime).toContain("email: false");
		expect(runtime).toContain("socials: false");
		expect(runtime).toContain("swaps: false");
		expect(runtime).toContain("onramp: false");
		expect(runtime).toContain("smartSessions: false");
		expect(runtime).toContain("pay: false");
		expect(runtime).toContain("reownAuthentication: false");
		expect(runtime).toContain('eip155: "eoa"');
		expect(runtime).toContain('coinbasePreference: "eoaOnly"');
		expect(runtime).toContain("const networks = [mainnet]");
		expect(runtime).toContain("storage: cookieStorage");
		expect(runtime).toContain("ssr: true");
		expect(runtime).toContain("cookieToInitialState");
		expect(runtime).not.toContain("@reown/appkit-siwe");
		expect(runtime).not.toContain("buildSiweMessage");
	});

	it("wires both wallet entry points while preserving the injected fallback", () => {
		const signIn = readSource("../app/(auth)/sign-in/_components/sign-in.tsx");
		const security = readSource(
			"../app/dashboard/security/security-center.tsx",
		);

		expect(signIn).toContain("<ReownWalletEntry");
		expect(signIn).toContain('purpose="sign-in"');
		expect(security).toContain("<ReownWalletEntry");
		expect(security).toContain('purpose="link-wallet"');
		expect(security).toContain("getInjectedEthereumProvider");
		expect(security).toContain("completeWalletProof");
		expect(security).toContain("identity.chainId !== 1");
		expect(security).toContain("walletCapabilities.methods.siwe === true");
		expect(security).toContain("isSiweWalletUiEnabled");
		expect(security).not.toContain("buildSiweMessage");
		expect(security).not.toContain("authClient.siwe.nonce");
	});

	it("surfaces wallet status from the account overview and deep-links to management", () => {
		const dashboard = readSource("../app/dashboard/page.tsx");
		const overview = readSource(
			"../app/dashboard/_components/wallet-overview-card.tsx",
		);
		const security = readSource(
			"../app/dashboard/security/security-center.tsx",
		);
		const dashboardI18n = readSource("./dashboard-i18n.ts");

		expect(dashboard).toMatch(/auth\.api\s*\.listWallets/);
		expect(dashboard).toContain("getWalletOverviewSummary");
		expect(dashboard).toContain("<WalletOverviewCard");
		expect(overview).toContain('href="/dashboard/security#wallets"');
		expect(overview).toContain("messages.bindWallet");
		expect(overview).toContain("messages.manageWallets");
		expect(dashboardI18n).toContain('bindWallet: "Bind wallet"');
		expect(dashboardI18n).toContain('manageWallets: "Manage wallets"');
		expect(security).toContain('id="wallets"');
	});
});
