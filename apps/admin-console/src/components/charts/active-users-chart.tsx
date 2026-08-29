"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { AccessibleChart } from "@/components/charts/accessible-chart";
import { ChartState } from "@/components/charts/chart-state";
import { useLoginActivity } from "@/hooks/use-login-activity";
import { useThemeTokens } from "@/hooks/use-theme-tokens";
import { trailingUtcDayKeys } from "@/lib/dashboard-metrics";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * Daily active-users trend, derived client-side from the audit log
 * (successful `user.login` events grouped by day + distinct actor).
 *
 * NOTE: cinaauth has no dedicated DAU/retention endpoint, so this is an
 * approximation based on login events. True retention (next-day / 7-day)
 * requires a backend cohort endpoint — see the retention placeholder card.
 */
export function ActiveUsersChart({ days = 14 }: { days?: number }) {
	const { data, isLoading, isError, refetch } = useLoginActivity(days);
	const { v, themeKey } = useThemeTokens();
	const { t } = useI18n();

	const rows = data?.rows ?? [];

	// Bucket into the last `days` days, counting distinct actors per day.
	const byDay = new Map<string, Set<string>>();
	for (const day of trailingUtcDayKeys(days)) byDay.set(day, new Set());
	for (const row of rows) {
		const day = (row.timestamp ?? "").slice(0, 10);
		const bucket = byDay.get(day);
		if (bucket) bucket.add(row.actorId ?? "anon");
	}
	const chartData = Array.from(byDay.entries()).map(([date, actors]) => ({
		date: date.slice(5), // MM-DD
		active: actors.size,
	}));

	if (isLoading) return <ChartState status="loading" />;
	if (isError)
		return <ChartState status="error" onRetry={() => void refetch()} />;
	if (chartData.every((point) => point.active === 0))
		return <ChartState status="empty" />;

	return (
		<AccessibleChart
			label={t("dashboard.activeTrend.title")}
			summary={chartData
				.map((point) => `${point.date}: ${point.active}`)
				.join(", ")}
		>
			<ResponsiveContainer width="100%" height={240}>
				<BarChart key={themeKey} data={chartData}>
					<CartesianGrid
						stroke={v("--hairline", "#ebebeb")}
						strokeDasharray="3 3"
						vertical={false}
					/>
					<XAxis
						dataKey="date"
						stroke={v("--mute", "#888")}
						fontSize={11}
						tickLine={false}
						axisLine={{ stroke: v("--hairline", "#ebebeb") }}
					/>
					<YAxis
						stroke={v("--mute", "#888")}
						fontSize={11}
						allowDecimals={false}
						tickLine={false}
						axisLine={false}
					/>
					<Tooltip
						cursor={{ fill: v("--canvas-soft-2", "#f5f5f5") }}
						contentStyle={{
							background: v("--canvas", "#fff"),
							border: `1px solid ${v("--hairline", "#ebebeb")}`,
							borderRadius: "6px",
							color: v("--ink", "#171717"),
						}}
					/>
					<Bar
						dataKey="active"
						fill={v("--chart-1", "#0070f3")}
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</AccessibleChart>
	);
}
