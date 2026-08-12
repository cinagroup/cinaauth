"use client";

import type { LucideIcon } from "lucide-react";
import {
	ArrowRight,
	Building2,
	Code2,
	CreditCard,
	ExternalLink,
	LockKeyhole,
	ShieldCheck,
	TriangleAlert,
	User,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { MeSection, MeSectionKey, MeSelfServiceAccess } from "@/lib/me";
import { getMeSection, getMeSelfServiceAccess, ME_SECTIONS } from "@/lib/me";

const SECTION_ICONS: Record<MeSectionKey, LucideIcon> = {
	security: ShieldCheck,
	privacy: LockKeyhole,
	organization: Building2,
	developer: Code2,
	billing: CreditCard,
};

export function MeOverviewPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const access = getMeSelfServiceAccess(session ?? null);

	return (
		<div className="max-w-5xl space-y-6">
			<PageHeader title={t("me.title")} description={t("me.description")}>
				<Badge variant="outline">{t("me.adminOnly")}</Badge>
			</PageHeader>

			<ImpersonationNotice access={access} />

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader className="flex-row items-start gap-3 space-y-0">
						<IconFrame icon={User} />
						<div className="min-w-0">
							<CardTitle>{t("me.currentAccount")}</CardTitle>
							<CardDescription>
								{t("me.currentAccountDescription")}
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="space-y-3 border-t border-hairline pt-4">
						<AccountRow label={t("me.email")} value={session?.email ?? "—"} />
						<AccountRow label={t("me.name")} value={session?.name ?? "—"} />
						<AccountRow label={t("me.role")} value={session?.role ?? "—"} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex-row items-start gap-3 space-y-0">
						<IconFrame icon={ShieldCheck} />
						<div className="min-w-0">
							<CardTitle>{t("me.boundaryTitle")}</CardTitle>
							<CardDescription>{t("me.boundaryDescription")}</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="border-t border-hairline pt-4 text-[13px] leading-5 text-body">
						{t("me.boundaryDetail")}
					</CardContent>
				</Card>
			</div>

			<Section label={t("me.sections")}>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{ME_SECTIONS.map((section) => (
						<MeSectionCard key={section.key} section={section} />
					))}
				</div>
			</Section>
		</div>
	);
}

export function MeAreaPage({ sectionKey }: { sectionKey: MeSectionKey }) {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const access = getMeSelfServiceAccess(session ?? null);
	const section = getMeSection(sectionKey);
	const Icon = SECTION_ICONS[sectionKey];

	return (
		<div className="max-w-4xl space-y-6">
			<PageHeader
				title={t(`me.${sectionKey}.title`)}
				description={t(`me.${sectionKey}.description`)}
				backHref="/me"
				backLabel={t("me.back")}
			>
				<Badge variant="muted">{t("me.readOnly")}</Badge>
			</PageHeader>

			<ImpersonationNotice access={access} />

			<Card>
				<CardHeader className="flex-row items-start gap-3 space-y-0">
					<IconFrame icon={Icon} />
					<div className="min-w-0">
						<CardTitle>{t("me.handoffTitle")}</CardTitle>
						<CardDescription>{t("me.handoffDescription")}</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<p className="text-[13px] font-medium leading-5 text-ink">
							accounts.cinaseek.ai
						</p>
						<p className="mt-0.5 text-[12px] leading-4 text-mute">
							{t("me.handoffSafety")}
						</p>
					</div>
					<AccountsHandoff access={access} href={section.accountsHref} />
				</CardContent>
			</Card>

			<Section label={t("me.otherSections")}>
				<div className="grid gap-3 sm:grid-cols-2">
					{ME_SECTIONS.filter((candidate) => candidate.key !== sectionKey).map(
						(candidate) => (
							<MeSectionCard key={candidate.key} section={candidate} compact />
						),
					)}
				</div>
			</Section>
		</div>
	);
}

function MeSectionCard({
	section,
	compact = false,
}: {
	section: MeSection;
	compact?: boolean;
}) {
	const { t } = useI18n();
	const Icon = SECTION_ICONS[section.key];

	return (
		<Link
			href={section.href}
			className="group flex min-w-0 items-start gap-3 rounded-[var(--radius-lg)] border border-hairline bg-canvas p-4 shadow-card transition-colors hover:bg-canvas-soft-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/40"
		>
			<IconFrame icon={Icon} />
			<span className="min-w-0 flex-1">
				<span className="block text-[14px] font-semibold leading-5 text-ink">
					{t(`me.${section.key}.title`)}
				</span>
				{!compact ? (
					<span className="mt-1 block text-[13px] leading-5 text-body">
						{t(`me.${section.key}.description`)}
					</span>
				) : null}
			</span>
			<ArrowRight
				size={15}
				className="mt-1 shrink-0 text-mute transition-transform group-hover:translate-x-0.5"
				aria-hidden
			/>
		</Link>
	);
}

function IconFrame({ icon: Icon }: { icon: LucideIcon }) {
	return (
		<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft text-body">
			<Icon size={17} aria-hidden />
		</span>
	);
}

function AccountRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex min-w-0 items-start justify-between gap-4 text-[13px] leading-5">
			<span className="shrink-0 text-mute">{label}</span>
			<span className="min-w-0 break-all text-right font-medium text-ink">
				{value}
			</span>
		</div>
	);
}

function ImpersonationNotice({ access }: { access: MeSelfServiceAccess }) {
	const { t } = useI18n();
	if (access !== "impersonating") return null;

	return (
		<div
			role="status"
			className="flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/40 bg-warning-soft p-4 text-warning"
		>
			<TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
			<div className="min-w-0">
				<p className="text-[14px] font-semibold leading-5">
					{t("me.impersonatingTitle")}
				</p>
				<p className="mt-1 text-[13px] leading-5">
					{t("me.impersonatingDescription")}
				</p>
			</div>
		</div>
	);
}

function AccountsHandoff({
	access,
	href,
}: {
	access: MeSelfServiceAccess;
	href: string;
}) {
	const { t } = useI18n();
	if (access === "allowed") {
		return (
			<Button asChild variant="secondary" size="sm">
				<a href={href} target="_blank" rel="noopener noreferrer">
					<ExternalLink size={15} />
					{t("me.openAccounts")}
				</a>
			</Button>
		);
	}

	return (
		<Button variant="secondary" size="sm" disabled>
			<ExternalLink size={15} />
			{access === "impersonating"
				? t("me.handoffBlocked")
				: t("common.loading")}
		</Button>
	);
}
