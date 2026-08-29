import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { OAuthConsentSearchParams } from "@/lib/oauth-consent-scopes";
import {
	buildOAuthConsentSignInPath,
	getOfficialCinaSeekOAuthClientReturnHost,
	isOfficialCinaSeekOAuthClient,
	resolveOAuthConsentScopes,
} from "@/lib/oauth-consent-scopes";
import { OAuthConsentView } from "./consent-view";

export const metadata: Metadata = {
	title: "Authorize Application",
	description: "Grant access to your account",
};

interface AuthorizePageProps {
	searchParams: Promise<OAuthConsentSearchParams>;
}

export default async function AuthorizePage({
	searchParams,
}: AuthorizePageProps) {
	const resolvedSearchParams = await searchParams;
	const scope = Array.isArray(resolvedSearchParams.scope)
		? resolvedSearchParams.scope[0]
		: resolvedSearchParams.scope;
	const clientId = Array.isArray(resolvedSearchParams.client_id)
		? resolvedSearchParams.client_id[0]
		: resolvedSearchParams.client_id;
	const requestHeaders = await headers();
	const session = await auth.api
		.getSession({
			headers: requestHeaders,
		})
		.catch(() => null);
	if (!session) {
		redirect(buildOAuthConsentSignInPath(resolvedSearchParams));
	}
	if (!clientId) notFound();

	const clientDetails = await auth.api
		.getOAuthClientPublic({
			query: {
				client_id: clientId,
			},
			headers: requestHeaders,
		})
		.catch(() => null);
	if (!clientDetails) notFound();

	const organization = session.session.activeOrganizationId
		? await auth.api.getFullOrganization({
				headers: requestHeaders,
			})
		: undefined;

	return (
		<OAuthConsentView
			clientName={clientDetails.client_name}
			isOfficialClient={isOfficialCinaSeekOAuthClient(clientId)}
			returnHost={getOfficialCinaSeekOAuthClientReturnHost(clientId)}
			user={session.user}
			requestedScopes={resolveOAuthConsentScopes(scope)}
			organizationName={organization?.name}
		/>
	);
}
