"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AccessibleChart } from "@/components/charts/accessible-chart";
import { ChartState } from "@/components/charts/chart-state";
import { useLoginActivity } from "@/hooks/use-login-activity";
import { useThemeTokens } from "@/hooks/use-theme-tokens";
import { fetchAdminJson } from "@/lib/client-api";
import { trailingUtcDayKeys } from "@/lib/dashboard-metrics";
import { useI18n } from "@/lib/i18n/i18n-context";

interface SignupPoint {
	date: string;
	count: number;
}

/**
 * Stacked cohort bar — the signature BAC chart. Three series stacked per day:
 *  - 新增 (new): users who signed up that day (from the signup series)
 *  - 回流 (reactivated): login events from users who did NOT sign up that day
 *
 * NOTE: true retention cohorts (next-day / 7-day retained) need a backend
 * cohort endpoint cinaauth doesn't expose. This is a login-derived proxy that
 * matches BAC's *visual* language (stacked bars, hidden Y axis, 3 accent
 * tints). Swap in real cohort data when the endpoint lands.
 *
 * Y-axis is intentionally hidden to mirror BAC (relative shape matters more
 * than exact counts on this overview).
 */
export function CohortBars({ days = 14 }: { days?: number }) {
	const loginsQuery = useLoginActivity(days);
	const { t } = useI18n();
	const signupsQuery = useQuery<SignupPoint[]>({
		queryKey: ["cohort-signups", days],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok?: boolean;
				data?: { data?: SignupPoint[] };
			}>("/api/admin/stats/signups?range=30d");
			return d.data?.data ?? [];
		},
	});

	// Build day buckets for the window.
	const byDay = new Map<string, { newUsers: number; returning: number }>();
	for (const day of trailingUtcDayKeys(days)) {
		byDay.set(day, { newUsers: 0, returning: 0 });
	}
	// New users per day from the signup series.
	for (const p of signupsQuery.data ?? []) {
		const day = (p.date ?? "").slice(0, 10);
		const b = byDay.get(day);
		if (b) b.newUsers = p.count;
	}
	// Returning = successful logins whose actor did NOT sign up that same day.
	// (Approximation: distinct actor per day, minus that day's new signups.)
	const actorsPerDay = new Map<string, Set<string>>();
	for (const day of byDay.keys()) actorsPerDay.set(day, new Set<string>());
	for (const row of loginsQuery.data?.rows ?? []) {
		const day = (row.timestamp ?? "").slice(0, 10);
		const set = actorsPerDay.get(day);
		if (set) set.add(row.actorId ?? "anon");
	}
	for (const [day, b] of byDay.entries()) {
		const distinct = actorsPerDay.get(day)?.size ?? 0;
		b.returning = Math.max(0, distinct - b.newUsers);
	}

	const chartData = Array.from(byDay.entries()).map(([date, b]) => ({
		date: date.slice(5), // MM-DD
		new: b.newUsers,
		returning: b.returning,
	}));

	const { v, themeKey } = useThemeTokens();
	// Indigo tints for the stacked segments (BAC chart palette).
	const c1 = v("--chart-1", "#0070f3");
	const c2 = v("--chart-2", "#7928ca");

	if (loginsQuery.isLoading || signupsQuery.isLoading) {
		return <ChartState status="loading" height={200} />;
	}
	if (loginsQuery.isError || signupsQuery.isError) {
		return (
			<ChartState
				status="error"
				height={200}
				onRetry={() => {
					void Promise.all([loginsQuery.refetch(), signupsQuery.refetch()]);
				}}
			/>
		);
	}
	if (
		(loginsQuery.data?.rows.length ?? 0) === 0 &&
		(signupsQuery.data?.length ?? 0) === 0
	) {
		return <ChartState status="empty" height={200} />;
	}

	return (
		<AccessibleChart
			label={t("dashboard.cohort.title")}
			summary={chartData
				.map(
					(point) =>
						`${point.date}: ${t("dashboard.cohort.new")} ${point.new}, ${t("dashboard.cohort.returning")} ${point.returning}`,
				)
				.join(", ")}
		>
			<ResponsiveContainer width="100%" height={200}>
				<BarChart key={themeKey} data={chartData} barCategoryGap="20%">
					<XAxis
						dataKey="date"
						stroke={v("--mute", "#888")}
						fontSize={11}
						tickLine={false}
						axisLine={false}
					/>
					{/* Y-axis intentionally hidden — BAC shows relative shape only */}
					<Tooltip
						cursor={{ fill: v("--canvas-soft-2", "#f5f5f5"), radius: 4 }}
						contentStyle={{
							background: v("--canvas", "#fff"),
							border: `1px solid ${v("--hairline", "#ebebeb")}`,
							borderRadius: "6px",
							color: v("--ink", "#171717"),
						}}
					/>
					<Bar dataKey="new" stackId="cohort" fill={c1} radius={[0, 0, 0, 0]} />
					<Bar
						dataKey="returning"
						stackId="cohort"
						fill={c2}
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</AccessibleChart>
	);
}
