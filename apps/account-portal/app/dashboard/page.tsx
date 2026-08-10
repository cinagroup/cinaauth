import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AccountSwitcher from "@/components/account-switch";
import { auth } from "@/lib/auth";
import { getBillingUiState } from "@/lib/billing-console";
import OrganizationCard from "./_components/organization-card";
import SubscriptionCard from "./_components/subscription-card";
import UserCard from "./_components/user-card";

export default async function Page() {
	const requestHeaders = await headers();

	const session = await auth.api.getSession({
		headers: requestHeaders,
	});
	if (!session) {
		redirect("/sign-in");
	}

	const [deviceSessions, capabilities, entitlements] = await Promise.all([
		auth.api.listDeviceSessions({ headers: requestHeaders }),
		auth.api
			.getCapabilities({ headers: requestHeaders })
			.catch(() => ({ billing: false })),
		auth.api
			.getEntitlements(undefined, { headers: requestHeaders })
			.catch(() => null),
	]);
	const billing = getBillingUiState({
		billingCapability: capabilities.billing === true,
		entitlements,
	});

	return (
		<div className="w-full">
			<div className="flex gap-4 flex-col">
				<AccountSwitcher
					deviceSessions={deviceSessions}
					initialSession={session}
				/>
				<UserCard session={session} />
				<OrganizationCard session={session} />
				<SubscriptionCard
					billingEnabled={billing.billingEnabled}
					entitlements={entitlements}
				/>
			</div>
		</div>
	);
}
