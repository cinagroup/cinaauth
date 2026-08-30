"use client";

import { AccountBrand } from "@/components/account-brand";
import EntryButton from "@/components/entry-button";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function HomePage({ authenticated }: { authenticated: boolean }) {
	const { messages } = useI18n();
	const benefits = [
		{
			index: "01",
			title: messages.benefitAccessTitle,
			description: messages.benefitAccessDescription,
		},
		{
			index: "02",
			title: messages.benefitSecurityTitle,
			description: messages.benefitSecurityDescription,
		},
		{
			index: "03",
			title: messages.benefitControlTitle,
			description: messages.benefitControlDescription,
		},
	];

	return (
		<div className="relative min-h-screen overflow-hidden bg-canvas-soft">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,color-mix(in_srgb,var(--cyan)_16%,transparent),transparent_32%),radial-gradient(circle_at_88%_12%,color-mix(in_srgb,var(--violet)_13%,transparent),transparent_34%)]"
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,var(--hairline)_1px,transparent_1px),linear-gradient(to_bottom,var(--hairline)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
			/>

			<div className="relative mx-auto flex min-h-screen w-full max-w-[1240px] flex-col px-5 sm:px-8 lg:px-10">
				<header className="flex h-20 items-center justify-between gap-4 border-b border-hairline/80">
					<AccountBrand tagline={messages.accountTagline} priority />
					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						<ThemeToggle label={messages.themeToggle} />
					</div>
				</header>

				<section
					aria-labelledby="home-hero-title"
					className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-20 lg:py-20"
				>
					<div className="max-w-2xl">
						<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas/80 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-body uppercase shadow-l1 backdrop-blur">
							<span className="h-1.5 w-1.5 rounded-full bg-cyan-deep" />
							{messages.homeEyebrow}
						</div>
						<h1
							id="home-hero-title"
							className="max-w-[760px] text-[clamp(2.65rem,7vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.065em] text-ink"
						>
							{messages.heroTitle}
						</h1>
						<p className="mt-7 max-w-xl text-base leading-7 text-body sm:text-lg sm:leading-8">
							{messages.heroDescription}
						</p>
						<div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
							<EntryButton
								authenticated={authenticated}
								signInLabel={messages.signIn}
								dashboardLabel={messages.dashboard}
							/>
							<p className="max-w-xs text-sm leading-6 text-mute">
								{messages.directSignIn}
							</p>
						</div>
					</div>

					<div className="relative mx-auto w-full max-w-[500px] lg:mx-0">
						<div
							aria-hidden
							className="absolute -inset-5 rounded-[2rem] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--cyan)_18%,transparent),color-mix(in_srgb,var(--violet)_16%,transparent))] blur-2xl"
						/>
						<div className="relative overflow-hidden rounded-[1.5rem] border border-hairline bg-canvas/95 p-5 shadow-[0_32px_80px_-48px_rgb(0_0_0/0.5)] backdrop-blur sm:p-7">
							<div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
								<div>
									<p className="text-xs font-semibold tracking-[0.1em] text-mute uppercase">
										{messages.accountPreview}
									</p>
									<p className="mt-1 text-lg font-semibold text-ink">
										CinaSeek Accounts
									</p>
								</div>
								<div className="inline-flex items-center gap-2 rounded-full bg-canvas-soft-2 px-3 py-1.5 text-xs font-medium text-body">
									<span className="h-2 w-2 rounded-full bg-cyan-deep" />
									{messages.accountProtected}
								</div>
							</div>

							<div className="divide-y divide-hairline">
								<AccountRow
									index="01"
									title={messages.signInMethodsTitle}
									description={messages.signInMethodsDescription}
								/>
								<AccountRow
									index="02"
									title={messages.securityCenterTitle}
									description={messages.securityCenterDescription}
								/>
								<AccountRow
									index="03"
									title={messages.privacyAppsTitle}
									description={messages.privacyAppsDescription}
								/>
							</div>

							<p className="border-t border-hairline pt-5 text-sm leading-6 text-mute">
								{messages.previewNote}
							</p>
						</div>
					</div>
				</section>

				<section className="grid gap-px overflow-hidden rounded-t-xl border-x border-t border-hairline bg-hairline md:grid-cols-3">
					{benefits.map((benefit) => (
						<div
							key={benefit.index}
							className="bg-canvas/90 p-6 backdrop-blur sm:p-7"
						>
							<p className="font-mono text-xs text-mute">{benefit.index}</p>
							<h2 className="mt-4 text-base font-semibold text-ink">
								{benefit.title}
							</h2>
							<p className="mt-2 text-sm leading-6 text-body">
								{benefit.description}
							</p>
						</div>
					))}
				</section>
			</div>
		</div>
	);
}

function AccountRow({
	index,
	title,
	description,
}: {
	index: string;
	title: string;
	description: string;
}) {
	return (
		<div className="grid grid-cols-[2.25rem_1fr] gap-3 py-5">
			<div className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas-soft-2 font-mono text-[11px] text-mute">
				{index}
			</div>
			<div>
				<h2 className="text-sm font-semibold text-ink">{title}</h2>
				<p className="mt-1 text-sm leading-6 text-body">{description}</p>
			</div>
		</div>
	);
}
