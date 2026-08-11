import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSessionRecent } from "@/lib/security-center";
import { PrivacyCenter } from "./privacy-center";

export const metadata: Metadata = {
	title: "Privacy Center",
	description: "Export and control your personal CinaSeek account data.",
};

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
