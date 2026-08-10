import Link from "next/link";
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
		<div className="min-h-[80vh] flex flex-col items-center justify-center overflow-hidden no-visible-scrollbar relative">
			{/* Spec: hero-band — mesh gradient atmospheric backdrop.
			 * Fixed behind content, full viewport, blurred + faded. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0 mesh-gradient-hero"
			/>

			<main
				id="main"
				className="relative z-10 flex flex-col gap-8 items-center justify-center py-48 px-4 md:px-6"
			>
				<div className="flex flex-col gap-4 text-center max-w-2xl">
					{/* Spec: banner-marketing — rounded-full, canvas-soft bg, body-sm, body text.
					 * Badge uses caption-mono per spec (technical voice). */}
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-canvas-soft shadow-inset-hairline text-sm text-body w-fit mx-auto mb-2">
						<span className="text-xs font-mono uppercase tracking-wider">
							Enterprise-grade authentication
						</span>
					</div>
					{/* Spec: display-xl — 48/600/48/-2.4px, sentence-case, period-terminated. */}
					<h1 className="text-[48px] font-semibold text-ink tracking-[-2.4px] leading-[48px]">
						CinaAuth.
					</h1>
					<p className="text-[18px] leading-[28px] text-body">
						Official demo to showcase{" "}
						<a
							href="https://cinagroup.com"
							target="_blank"
							rel="noopener noreferrer"
							className="text-link hover:text-link-deep underline underline-offset-4 transition-colors"
						>
							cinaauth
						</a>{" "}
						features and capabilities.
					</p>
				</div>

				{/* Spec: CTA row = button-primary + button-secondary. */}
				<div className="flex items-center gap-3">
					<EntryButton session={session} />
					<Link
						href="https://www.cinagroup.com/docs"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-12 items-center justify-center rounded-pill px-3 text-base font-medium text-ink bg-canvas shadow-inset-hairline hover:bg-canvas-soft transition-colors"
					>
						View docs
					</Link>
				</div>

				<div className="w-full max-w-4xl flex flex-col gap-6">
					{/* Spec: section eyebrow = caption-mono uppercase mono. */}
					<div className="text-xs font-mono uppercase tracking-wider text-body text-center">
						Features.
					</div>
					{/* Spec: feature grid 3-up desktop → 1-up mobile. gap-3 (12px) per spec. */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{features.map((feature) => (
							<FeatureCard
								key={feature.name}
								name={feature.name}
								link={feature.link}
							/>
						))}
					</div>
				</div>
			</main>
		</div>
	);
}
