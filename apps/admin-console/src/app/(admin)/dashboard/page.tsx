"use client";

import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/charts/stat-card";
import { ChannelPie } from "@/components/charts/channel-pie";
import { CohortBars } from "@/components/charts/cohort-bars";
import { SignupLine } from "@/components/charts/signup-line";
import { ActiveUsersChart } from "@/components/charts/active-users-chart";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { useI18n } from "@/lib/i18n/i18n-context";
import { fetchAdminJson } from "@/lib/client-api";
import type {
	SignupPointDTO,
	StatsOverviewDTO,
	SecurityTodayDTO,
} from "@/lib/cinaauth/dto";
import {
	Building2,
	AlertTriangle,
	KeyRound,
	MonitorSmartphone,
	ShieldAlert,
	ShieldCheck,
	UserPlus,
	UserRoundX,
	Users,
	RefreshCw,
} from "lucide-react";

/** Sum counts in `series` whose date falls within the last `days` days. */
function sumLastDays(series: SignupPointDTO[], days: number): number {
	const cutoff = new Date();
	cutoff.setHours(0, 0, 0, 0);
	cutoff.setDate(cutoff.getDate() - days);
	return series
		.filter((p) => new Date(p.date) >= cutoff)
		.reduce((a, p) => a + p.count, 0);
}

/** Percent change of `cur` vs `prev`. Returns null when prev is 0 (undefined). */
function pctChange(cur: number, prev: number): number | null {
	if (prev === 0) return cur === 0 ? 0 : null;
	return ((cur - prev) / prev) * 100;
}

function todayLabel(lang: "zh" | "en") {
	const d = new Date();
	return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
		month: "short",
		day: "numeric",
	});
}

const EMPTY_OVERVIEW: StatsOverviewDTO = {
	totalUsers: 0,
	newUsers30d: 0,
	activeSessions: 0,
	organizationCount: 0,
	bannedCount: 0,
	usersWithout2FA: 0,
	loginChannels: {},
};
const EMPTY_SECURITY: SecurityTodayDTO = {
	failedLoginsToday: 0,
	otpRequestsToday: 0,
	geoAnomalyCount: 0,
};

export default function DashboardPage() {
	const { t, lang } = useI18n();
	// Client-side data fetching — the shell renders instantly (no SSR await on
	// cinaauth), so navigation to /dashboard is as fast as the other pages.
	// Each query is independent and caches in React Query.
	const overviewQuery = useQuery({
		queryKey: ["stats-overview"],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok?: boolean;
				data?: StatsOverviewDTO;
			}>("/api/admin/stats/overview");
			return d.data ?? EMPTY_OVERVIEW;
		},
		staleTime: 60_000,
	});
	const signupsQuery = useQuery<SignupPointDTO[]>({
		queryKey: ["stats-signups", "30d"],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok?: boolean;
				data?: { data?: SignupPointDTO[] };
			}>("/api/admin/stats/signups?range=30d");
			return d.data?.data ?? [];
		},
		staleTime: 60_000,
	});
	const securityQuery = useQuery({
		queryKey: ["stats-security"],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok?: boolean;
				data?: SecurityTodayDTO;
			}>("/api/admin/stats/security-today");
			return d.data ?? EMPTY_SECURITY;
		},
		staleTime: 60_000,
	});
	const alertsQuery = useQuery({
		queryKey: ["audit-alerts"],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok?: boolean;
				data?: { alerts?: Array<{ actorId?: string; failureCount?: number; lastIp?: string }> };
			}>("/api/admin/audit/alerts?windowHours=24&failThreshold=5");
			return d.data?.alerts ?? [];
		},
		staleTime: 60_000,
	});

	const ov = overviewQuery.data ?? EMPTY_OVERVIEW;
	const sec = securityQuery.data ?? EMPTY_SECURITY;
	const signupSeries = signupsQuery.data ?? [];
	const alerts = alertsQuery.data ?? [];
	const ovLoading = overviewQuery.isLoading;
	const today = todayLabel(lang);
	const hasDataError =
		overviewQuery.isError ||
		signupsQuery.isError ||
		securityQuery.isError ||
		alertsQuery.isError;
	const retryDashboard = () => {
		void Promise.all([
			overviewQuery.refetch(),
			signupsQuery.refetch(),
			securityQuery.refetch(),
			alertsQuery.refetch(),
		]);
	};

	// Derive deltas from the 30d signup series: compare last 7d vs prior 7d.
	const signups7d = sumLastDays(signupSeries, 7);
	const signupsPrev7d = sumLastDays(signupSeries, 14) - signups7d;
	const signupsDelta = pctChange(signups7d, signupsPrev7d);
	const sparkSignups = signupSeries.slice(-14).map((p) => p.count);

	/** Skeleton placeholder matching the StatCard shape. */
	const StatSkeleton = () => (
		<div className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-hairline bg-canvas p-5 shadow-card">
			<div className="w-full space-y-2">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-7 w-16" />
			</div>
		</div>
	);

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("dashboard.title")}
				description={`${t("dashboard.subtitle")} · ${today}`}
			/>
			{hasDataError && (
				<div
					role="alert"
					className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-warning/40 bg-warning-soft px-4 py-3 text-[14px] leading-5 text-body sm:flex-row sm:items-center sm:justify-between"
				>
					<span className="flex items-center gap-2">
						<AlertTriangle size={16} className="shrink-0 text-warning" />
						{t("dashboard.loadError")}
					</span>
					<Button variant="secondary" size="sm" onClick={retryDashboard}>
						<RefreshCw size={15} />
						{t("error.retry")}
					</Button>
				</div>
			)}

			{/* Users section */}
			<Section label={t("dashboard.section.users")}>
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					{ovLoading ? (
						<StatSkeleton />
					) : (
						<StatCard
							label={t("dashboard.totalUsers")}
							value={overviewQuery.isError ? "—" : ov.totalUsers}
							spark={sparkSignups}
							icon={Users}
						/>
					)}
					{ovLoading ? (
						<StatSkeleton />
					) : (
						<StatCard
							label={t("dashboard.activeUsers")}
							value={overviewQuery.isError ? "—" : ov.activeSessions}
							deltaLabel={today}
							icon={MonitorSmartphone}
						/>
					)}
					{ovLoading ? (
						<StatSkeleton />
					) : (
						<StatCard
							label={t("dashboard.newUsers30d")}
							value={overviewQuery.isError ? "—" : ov.newUsers30d}
							delta={signupsDelta ?? undefined}
							deltaLabel={t("dashboard.vsLastWeek")}
							spark={sparkSignups}
							icon={UserPlus}
							tone="info"
						/>
					)}
					{ovLoading ? (
						<StatSkeleton />
					) : (
						<StatCard
							label={t("dashboard.bannedCount")}
							value={overviewQuery.isError ? "—" : ov.bannedCount}
							icon={UserRoundX}
							tone="danger"
						/>
					)}
				</div>
			</Section>

			{/* User activity section — signature cohort chart */}
			<Section label={t("dashboard.section.activity")}>
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<div className="text-[14px] leading-5 text-body">
								{t("dashboard.cohort.title")}
							</div>
							<div className="flex items-center gap-4 text-[12px] leading-4 text-mute">
								<span className="inline-flex items-center gap-1.5">
									<span className="inline-block h-2 w-2 rounded-[2px] bg-chart-1" />
									{t("dashboard.cohort.new")}
								</span>
								<span className="inline-flex items-center gap-1.5">
									<span className="inline-block h-2 w-2 rounded-[2px] bg-chart-2" />
									{t("dashboard.cohort.returning")}
								</span>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							<CohortBars days={14} />
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<div className="text-[14px] leading-5 text-body">
								{t("dashboard.activeTrend.title")}
							</div>
							<div className="text-[12px] leading-4 text-mute">
								{t("dashboard.activeTrend.hint")}
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							<ActiveUsersChart days={14} />
						</CardContent>
				</Card>
			</div>
		</Section>

		{/* Organizations + security section */}
		<Section label={t("dashboard.section.orgSecurity")}>
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<StatCard
					label={t("dashboard.orgCount")}
					value={overviewQuery.isError ? "—" : ov.organizationCount}
					icon={Building2}
				/>
				<StatCard
					label={t("dashboard.no2fa")}
					value={overviewQuery.isError ? "—" : ov.usersWithout2FA}
					hint={t("dashboard.no2fa.hint")}
					icon={ShieldCheck}
					tone="warning"
				/>
				<StatCard
					label={t("dashboard.failedLogins")}
					value={securityQuery.isError ? "—" : sec.failedLoginsToday}
					icon={ShieldAlert}
					tone="danger"
				/>
				<StatCard
					label={t("dashboard.otpRequests")}
					value={securityQuery.isError ? "—" : sec.otpRequestsToday}
					icon={KeyRound}
					tone="info"
				/>
			</div>
		</Section>

		<Section label={t("dashboard.signupTrend")}>
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<div className="text-[14px] leading-5 text-body">
							{t("dashboard.signupTrend")}
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<SignupLine data={signupSeries} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<div className="text-[14px] leading-5 text-body">
							{t("dashboard.channelDist")}
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<ChannelPie channels={ov.loginChannels} />
					</CardContent>
				</Card>
			</div>
		</Section>

			{/* Security alerts — flagged actors from audit/alerts */}
			{(alerts?.length ?? 0) > 0 && (
				<Section label={t("dashboard.securityAlerts")}>
					<Card>
						<CardContent className="pt-6">
							<div className="space-y-2">
								{(alerts ?? []).map((a, i) => (
									<div key={i} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-error-soft px-4 py-2 text-[14px]">
										<span className="font-medium text-ink">
											{t("dashboard.securityAlerts.actor")}: {a.actorId || "unknown"}
										</span>
										<div className="flex items-center gap-4 text-body">
											<span>{t("dashboard.securityAlerts.failures")}: <strong className="text-error">{a.failureCount ?? 0}</strong></span>
											{a.lastIp && <span className="font-mono text-[12px]">{a.lastIp}</span>}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</Section>
			)}

		</div>
	);
}
