import {
	ArrowLeftRight,
	ArrowUpRight,
	Building,
	Clock3,
	Fingerprint,
	Mail,
	ShieldCheck,
	User,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import type { OAuthConsentSearchParams } from "@/lib/oauth-consent-scopes";
import {
	buildOAuthConsentSignInPath,
	getOAuthClientMonogram,
	resolveOAuthConsentScopes,
} from "@/lib/oauth-consent-scopes";
import { ConsentBtns } from "./consent-buttons";

export const metadata: Metadata = {
	title: "Authorize Application",
	description: "Grant access to your account",
};

interface AuthorizePageProps {
	searchParams: Promise<OAuthConsentSearchParams>;
}

function ConsentScopeIcon({ scope }: { scope: string }) {
	switch (scope) {
		case "openid":
			return <Fingerprint aria-hidden="true" className="h-5 w-5" />;
		case "profile":
			return <User aria-hidden="true" className="h-5 w-5" />;
		case "email":
			return <Mail aria-hidden="true" className="h-5 w-5" />;
		case "offline_access":
			return <Clock3 aria-hidden="true" className="h-5 w-5" />;
		case "read:organization":
			return <Building aria-hidden="true" className="h-5 w-5" />;
		default:
			return <ShieldCheck aria-hidden="true" className="h-5 w-5" />;
	}
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
	const _headers = await headers();
	const session = await auth.api
		.getSession({
			headers: _headers,
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
			headers: _headers,
		})
		.catch(() => null);
	if (!clientDetails) notFound();

	const organization = session?.session?.activeOrganizationId
		? await auth.api.getFullOrganization({
				headers: _headers,
			})
		: undefined;
	const requestedScopes = resolveOAuthConsentScopes(scope);

	return (
		<div className="py-16 md:py-24 px-4 md:px-6">
			{/* Spec: display-md (24/600/-0.96px), sentence-case + period. */}
			<h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.96px] text-ink mb-6 text-center">
				Authorize application.
			</h1>
			{/* Spec: showcase-band-dark — polarity-flipped (ink bg, on-primary text). */}
			<div className="min-h-screen bg-ink text-on-primary flex flex-col">
				<div className="flex flex-col items-center justify-center max-w-2xl mx-auto px-4">
					<div className="flex items-center gap-8 mb-8">
						<div className="w-16 h-16 border border-on-primary/20 rounded-full flex items-center justify-center">
							<span
								aria-label={`${clientDetails.client_name} application`}
								className="text-xl font-semibold"
							>
								{getOAuthClientMonogram(clientDetails.client_name)}
							</span>
						</div>
						<ArrowLeftRight className="h-6 w-6" />
						<div className="w-16 h-16 rounded-full overflow-hidden">
							<Avatar className="hidden h-16 w-16 sm:flex ">
								<AvatarImage
									src={session?.user.image || "#"}
									alt="Avatar"
									className="object-cover"
								/>
								<AvatarFallback>{session?.user.name.charAt(0)}</AvatarFallback>
							</Avatar>
						</div>
					</div>

					{/* Spec: display-lg (32/600/-1.28px), sentence-case + period. */}
					<h1 className="text-[32px] font-semibold leading-[40px] tracking-[-1.28px] text-on-primary text-center mb-8">
						{clientDetails.client_name} is requesting access to your CinaSeek
						account.
					</h1>

					{/* Spec: canvas-soft-2 surface inside polarity-flipped band. */}
					<Card className="w-full bg-canvas-soft-2 text-ink rounded-md shadow-l4">
						<CardContent className="p-6">
							<div className="flex items-center justify-between p-4 bg-canvas-soft rounded-md mb-6">
								<div>
									<div className="font-medium text-ink">
										{session?.user.name}
									</div>
									<div className="text-body">{session?.user.email}</div>
								</div>
								<ArrowUpRight className="h-5 w-5 text-mute" />
							</div>
							<div className="flex flex-col gap-1">
								<div className="text-lg mb-4 text-ink">
									Continuing will allow Sign in with {clientDetails.client_name}{" "}
									to:
								</div>
								<ul className="flex flex-col gap-3">
									{requestedScopes.map((requestedScope) => {
										const description =
											requestedScope.scope === "read:organization" &&
											organization?.name
												? `Read information about your organization ${organization.name}.`
												: requestedScope.description;

										return (
											<li
												key={requestedScope.scope}
												className="flex items-start gap-3 text-body"
											>
												<ConsentScopeIcon scope={requestedScope.scope} />
												<div>
													<div className="font-medium text-ink">
														{requestedScope.label}
													</div>
													{description ? <div>{description}</div> : null}
												</div>
											</li>
										);
									})}
								</ul>
							</div>
						</CardContent>
						<ConsentBtns />
					</Card>
				</div>
			</div>
		</div>
	);
}
