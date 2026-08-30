import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CORE_AUTH_CAPABILITIES } from "@/lib/auth-capabilities";
import { getReownInitialCookie } from "@/lib/reown-wallet-cookie";
import { dashboardMessages } from "@/lib/dashboard-i18n";
import { getRequestLocale } from "@/lib/request-locale";
import type {
	SecurityAccount,
	SecurityApiKey,
	SecurityPasskey,
	SecuritySession,
	SecurityWallet,
} from "@/lib/security-center";
import { getSecurityProviderLinkFailure } from "@/lib/security-center";
import { SecurityCenter } from "./security-center";

export async function generateMetadata(): Promise<Metadata> {
	const messages = dashboardMessages[await getRequestLocale()];
	return {
		title: messages.securityTitle,
		description: messages.securityMetadataDescription,
	};
}

const toIsoString = (value: Date | string) => new Date(value).toISOString();

type SecurityCenterPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SecurityCenterPage({
	searchParams,
}: SecurityCenterPageProps) {
	const providerLinkFailed = getSecurityProviderLinkFailure(
		(await searchParams).link,
	);
	const requestHeaders = await headers();
	const session = await auth.api.getSession({ headers: requestHeaders });
	if (!session) redirect("/sign-in");

	const [
		sessionsResult,
		accountsResult,
		passkeysResult,
		apiKeysResult,
		walletsResult,
		capabilities,
	] = await Promise.all([
		auth.api
			.listSessions({ headers: requestHeaders })
			.then((data) => ({ data, unavailable: false }))
			.catch(() => ({ data: [], unavailable: true })),
		auth.api
			.listUserAccounts({ headers: requestHeaders })
			.then((data) => ({ data, unavailable: false }))
			.catch(() => ({ data: [], unavailable: true })),
		auth.api
			.listPasskeys({ headers: requestHeaders })
			.then((data) => ({ data, unavailable: false }))
			.catch(() => ({ data: [], unavailable: true })),
		auth.api
			.listApiKeys({ headers: requestHeaders })
			.then((data) => ({ data: data.apiKeys, unavailable: false }))
			.catch(() => ({ data: [], unavailable: true })),
		auth.api
			.listWallets({ headers: requestHeaders })
			.then((data) => ({ data: data.wallets, unavailable: false }))
			.catch(() => ({ data: [], unavailable: true })),
		auth.api
			.getCapabilities({ headers: requestHeaders })
			.catch(() => CORE_AUTH_CAPABILITIES),
	]);

	const sessions: SecuritySession[] = sessionsResult.data.map((item) => ({
		id: item.id,
		token: item.token,
		createdAt: toIsoString(item.createdAt),
		expiresAt: toIsoString(item.expiresAt),
		ipAddress: item.ipAddress ?? null,
		userAgent: item.userAgent ?? null,
		isCurrent: item.id === session.session.id,
	}));
	const accounts: SecurityAccount[] = accountsResult.data.map((item) => ({
		id: item.id,
		accountId: item.accountId,
		providerId: item.providerId,
		createdAt: toIsoString(item.createdAt),
	}));
	const passkeys: SecurityPasskey[] = passkeysResult.data.map((item) => ({
		id: item.id,
		name: item.name ?? null,
		createdAt: toIsoString(item.createdAt),
	}));
	const apiKeys: SecurityApiKey[] = apiKeysResult.data.map((item) => ({
		id: item.id,
		name: item.name || "Unnamed API key",
		start: item.start ?? null,
		enabled: item.enabled,
		rateLimitEnabled: item.rateLimitEnabled,
		rateLimitTimeWindow: item.rateLimitTimeWindow ?? null,
		rateLimitMax: item.rateLimitMax ?? null,
		requestCount: item.requestCount,
		lastRequest: item.lastRequest ? toIsoString(item.lastRequest) : null,
		expiresAt: item.expiresAt ? toIsoString(item.expiresAt) : null,
		createdAt: toIsoString(item.createdAt),
		updatedAt: toIsoString(item.updatedAt),
	}));
	const wallets: SecurityWallet[] = walletsResult.data.map((item) => ({
		id: item.id,
		address: item.address,
		chainId: item.chainId,
		isPrimary: item.isPrimary,
		createdAt: toIsoString(item.createdAt),
	}));

	return (
		<SecurityCenter
			user={{
				name: session.user.name,
				email: session.user.email,
				emailVerified: session.user.emailVerified,
				twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
			}}
			currentSessionCreatedAt={toIsoString(session.session.createdAt)}
			initialSessions={sessions}
			initialAccounts={accounts}
			initialPasskeys={passkeys}
			initialApiKeys={apiKeys}
			initialWallets={wallets}
			configuredProviders={capabilities.oauthProviders}
			walletCapabilities={capabilities}
			walletCookie={getReownInitialCookie(requestHeaders.get("cookie"))}
			providerLinkFailed={providerLinkFailed}
			dataUnavailable={{
				sessions: sessionsResult.unavailable,
				accounts: accountsResult.unavailable,
				passkeys: passkeysResult.unavailable,
				apiKeys: apiKeysResult.unavailable,
				wallets: walletsResult.unavailable,
			}}
		/>
	);
}
