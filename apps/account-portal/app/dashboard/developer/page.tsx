import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dashboardMessages } from "@/lib/dashboard-i18n";
import {
	toDeveloperOAuthClient,
	toDeveloperOAuthConsent,
} from "@/lib/developer-console";
import { getRequestLocale } from "@/lib/request-locale";
import { DeveloperConsole } from "./developer-console";

export async function generateMetadata(): Promise<Metadata> {
	const messages = dashboardMessages[await getRequestLocale()];
	return {
		title: messages.developerTitle,
		description: messages.developerMetadataDescription,
	};
}

export default async function DeveloperConsolePage() {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({ headers: requestHeaders });
	if (!session) {
		redirect("/sign-in?callbackURL=/dashboard/developer");
	}

	const [clientsResult, consentsResult] = await Promise.all([
		auth.api
			.listOAuthClients({ headers: requestHeaders })
			.then((data) => ({ data, unavailable: false }))
			.catch(() => ({ data: [], unavailable: true })),
		auth.api
			.listOAuthConsents({ headers: requestHeaders })
			.then((data) => ({ data, unavailable: false }))
			.catch(() => ({ data: [], unavailable: true })),
	]);

	return (
		<DeveloperConsole
			currentSessionCreatedAt={new Date(
				session.session.createdAt,
			).toISOString()}
			emailVerified={session.user.emailVerified}
			initialClients={clientsResult.data.map(toDeveloperOAuthClient)}
			initialConsents={consentsResult.data.map(toDeveloperOAuthConsent)}
			dataUnavailable={{
				clients: clientsResult.unavailable,
				consents: consentsResult.unavailable,
			}}
		/>
	);
}
