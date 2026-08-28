import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AccountSwitcher from "@/components/account-switch";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { auth } from "@/lib/auth";
import { getBillingUiState } from "@/lib/billing-console";
import {
	getWalletOverviewSummary,
	requiresPasswordForTwoFactor as getRequiresPasswordForTwoFactor,
} from "@/lib/security-center";
import OrganizationCard from "./_components/organization-card";
import SubscriptionCard from "./_components/subscription-card";
import UserCard from "./_components/user-card";
import { WalletOverviewCard } from "./_components/wallet-overview-card";

export default async function Page() {
	const requestHeaders = await headers();

	const session = await auth.api.getSession({
		headers: requestHeaders,
	});
	if (!session) {
		redirect("/sign-in");
	}

	const [
		deviceSessions,
		capabilities,
		entitlements,
		accountsResult,
		walletsResult,
	] =
		await Promise.all([
			auth.api.listDeviceSessions({ headers: requestHeaders }),
			auth.api
				.getCapabilities({ headers: requestHeaders })
				.catch(() => ({ billing: false })),
			auth.api
				.getEntitlements(undefined, { headers: requestHeaders })
				.catch(() => null),
			auth.api
				.listUserAccounts({ headers: requestHeaders })
				.then((data) => ({ data, unavailable: false }))
				.catch(() => ({ data: [], unavailable: true })),
			auth.api
				.listWallets({ headers: requestHeaders })
				.then((data) => ({ data: data.wallets, unavailable: false }))
				.catch(() => ({ data: [], unavailable: true })),
		]);
	const requiresPasswordForTwoFactor = getRequiresPasswordForTwoFactor(
		accountsResult.data,
		accountsResult.unavailable,
	);
	const billing = getBillingUiState({
		billingCapability: capabilities.billing === true,
		entitlements,
	});
	const walletOverview = getWalletOverviewSummary(
		walletsResult.data,
		walletsResult.unavailable,
	);

	return (
		<div className="w-full">
			<DashboardPageHeader
				title="Account overview"
				description="Manage your profile, active workspace, and subscription from one place."
			/>
			<div className="flex flex-col gap-4">
				<AccountSwitcher
					deviceSessions={deviceSessions}
					initialSession={session}
				/>
				<div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
					<UserCard
						session={session}
						requiresPasswordForTwoFactor={requiresPasswordForTwoFactor}
					/>
					<div className="flex min-w-0 flex-col gap-4">
						<WalletOverviewCard summary={walletOverview} />
						<OrganizationCard session={session} />
						<SubscriptionCard
							billingEnabled={billing.billingEnabled}
							entitlements={entitlements}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
