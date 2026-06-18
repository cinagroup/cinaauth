import { headers } from "next/headers";
import EntryButton from "@/components/entry-button";
import { FeatureCard } from "@/components/feature-card";
import { auth } from "@/lib/auth";

const features: { name: string; link: string }[] = [
	{
		name: "Email & Password",
		link: "https://www.cinagroup.com/docs/authentication/email-password",
	},
	{
		name: "Organization | Teams",
		link: "https://www.cinagroup.com/docs/plugins/organization",
	},
	{
		name: "Passkeys",
		link: "https://www.cinagroup.com/docs/plugins/passkey",
	},
	{
		name: "Multi Factor",
		link: "https://www.cinagroup.com/docs/plugins/2fa",
	},
	{
		name: "Password Reset",
		link: "https://www.cinagroup.com/docs/authentication/email-password#request-password-reset",
	},
	{
		name: "Email Verification",
		link: "https://www.cinagroup.com/docs/authentication/email-password#email-verification",
	},
	{
		name: "Roles & Permissions",
		link: "https://www.cinagroup.com/docs/plugins/organization#roles",
	},
	{
		name: "Rate Limiting",
		link: "https://www.cinagroup.com/docs/reference/security#rate-limiting",
	},
	{
		name: "Session Management",
		link: "https://www.cinagroup.com/docs/concepts/session-management",
	},
	{
		name: "Multiple Session",
		link: "https://www.cinagroup.com/docs/plugins/multi-session",
	},
	{
		name: "Stripe Integration",
		link: "https://www.cinagroup.com/docs/plugins/stripe",
	},
	{
		name: "Last Login Method",
		link: "https://www.cinagroup.com/docs/plugins/last-login-method",
	},
	{
		name: "OAuth Provider",
		link: "https://www.cinagroup.com/docs/plugins/oauth-provider",
	},
];

export default async function Page() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return (
		<div className="min-h-[80vh] flex flex-col items-center justify-center overflow-hidden no-visible-scrollbar">
			<main className="flex flex-col gap-8 items-center justify-center py-16 md:py-24">
				<div className="flex flex-col gap-4 text-center max-w-2xl">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-xs text-muted-foreground w-fit mx-auto mb-2">
						<span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
						<span>Enterprise-grade authentication</span>
					</div>
					<h1 className="text-5xl md:text-6xl font-semibold text-foreground tracking-[-2.4px] leading-[1.1]">
						CinaAuth.
					</h1>
					<p className="text-base md:text-lg text-muted-foreground leading-relaxed">
						Official demo to showcase{" "}
						<a
							href="https://cinagroup.com"
							target="_blank"
							className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
						>
							cinaauth
						</a>{" "}
						features and capabilities.
					</p>
				</div>

				<div className="w-full max-w-3xl flex flex-col gap-6 px-4">
					<div className="flex items-center justify-center">
						<EntryButton session={session} />
					</div>

					<div className="relative">
						<div className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-center mb-4">
							Features
						</div>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
							{features.map((feature) => (
								<FeatureCard
									key={feature.name}
									name={feature.name}
									link={feature.link}
								/>
							))}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
