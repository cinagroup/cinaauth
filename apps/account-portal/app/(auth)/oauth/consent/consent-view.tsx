import {
	BadgeCheck,
	Building,
	Clock3,
	Fingerprint,
	Mail,
	ShieldCheck,
	User,
} from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OAuthConsentScope } from "@/lib/oauth-consent-scopes";
import { getOAuthClientMonogram } from "@/lib/oauth-consent-scopes";
import { ConsentBtns } from "./consent-buttons";

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

export function OAuthConsentView({
	clientName,
	isOfficialClient,
	returnHost,
	user,
	requestedScopes,
	organizationName,
}: {
	clientName: string;
	isOfficialClient: boolean;
	returnHost?: string;
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
	requestedScopes: OAuthConsentScope[];
	organizationName?: string;
}) {
	return (
		<AuthShell
			variant="transaction"
			title={`Allow ${clientName} to access your account?`}
			description={
				returnHost
					? `Review the requested access before continuing to ${returnHost}.`
					: "Review the requested access before continuing."
			}
			footer={
				<p>
					View the CinaSeek{" "}
					<Link
						href="https://www.cinagroup.com/terms"
						className="text-link underline underline-offset-4 hover:text-link-deep"
						target="_blank"
						rel="noopener noreferrer"
					>
						Terms of Service
					</Link>{" "}
					and{" "}
					<Link
						href="https://www.cinagroup.com/privacy"
						className="text-link underline underline-offset-4 hover:text-link-deep"
						target="_blank"
						rel="noopener noreferrer"
					>
						Privacy Policy
					</Link>
					.
				</p>
			}
		>
			<div className="space-y-4">
				<section
					aria-label="Application requesting access"
					className="flex items-center gap-3 rounded-md border border-hairline bg-canvas-soft p-3"
				>
					<span
						aria-label={`${clientName} application`}
						className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground shadow-inset-hairline"
					>
						{getOAuthClientMonogram(clientName)}
					</span>
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium text-ink">{clientName}</p>
						{isOfficialClient ? (
							<p className="mt-1 flex items-center gap-1.5 text-sm text-body">
								<BadgeCheck size={16} aria-hidden className="text-link" />
								CinaSeek official application
							</p>
						) : (
							<p className="mt-1 text-sm text-body">OAuth application</p>
						)}
					</div>
				</section>

				<section
					aria-label="Account granting access"
					className="flex items-center gap-3 rounded-md border border-hairline p-3"
				>
					<Avatar className="size-9 shrink-0">
						<AvatarImage
							src={user.image || undefined}
							alt={`${user.name} avatar`}
							className="object-cover"
						/>
						<AvatarFallback>
							{user.name.charAt(0) || user.email.charAt(0)}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<p className="text-xs font-medium uppercase tracking-wide text-mute">
							Signed in as
						</p>
						<p className="truncate font-medium text-ink">{user.name}</p>
						<p className="truncate text-sm text-body">{user.email}</p>
					</div>
				</section>

				<section aria-labelledby="requested-access-title">
					<h2
						id="requested-access-title"
						className="text-base font-semibold text-ink"
					>
						What this application can access
					</h2>
					<ul className="mt-2 space-y-2.5">
						{requestedScopes.map((requestedScope) => {
							const description =
								requestedScope.scope === "read:organization" && organizationName
									? `Read information about your organization ${organizationName}.`
									: requestedScope.description;

							return (
								<li
									key={requestedScope.scope}
									className="flex items-start gap-2.5 text-sm text-body"
								>
									<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-ink">
										<ConsentScopeIcon scope={requestedScope.scope} />
									</span>
									<div className="min-w-0">
										<p className="font-medium text-ink">
											{requestedScope.label}
										</p>
										<p>
											{description ??
												`Additional permission requested: ${requestedScope.scope}`}
										</p>
									</div>
								</li>
							);
						})}
					</ul>
				</section>

				<ConsentBtns clientName={clientName} />
			</div>
		</AuthShell>
	);
}
