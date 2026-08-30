import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dashboardMessages } from "@/lib/dashboard-i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { isSessionRecent } from "@/lib/security-center";
import { PrivacyCenter } from "./privacy-center";

export async function generateMetadata(): Promise<Metadata> {
	const messages = dashboardMessages[await getRequestLocale()];
	return {
		title: messages.privacyTitle,
		description: messages.privacyMetadataDescription,
	};
}

export default async function PrivacyCenterPage() {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({ headers: requestHeaders });
	if (!session) redirect("/sign-in");

	return (
		<PrivacyCenter
			recentAuthentication={isSessionRecent(
				new Date(session.session.createdAt).toISOString(),
			)}
		/>
	);
}
