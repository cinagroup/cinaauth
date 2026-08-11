"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ChartState } from "@/components/charts/chart-state";
import { useThemeTokens } from "@/hooks/use-theme-tokens";
import { fetchAdminJson } from "@/lib/client-api";

interface AuditRow {
	timestamp: string;
	actorId?: string | null;
	result?: string | null;
}

/**
 * Daily active-users trend, derived client-side from the audit log
 * (successful `user.login` events grouped by day + distinct actor).
 *
 * NOTE: cinaauth has no dedicated DAU/retention endpoint, so this is an
 * approximation based on login events. True retention (next-day / 7-day)
 * requires a backend cohort endpoint — see the retention placeholder card.
 */
export function ActiveUsersChart({ days = 14 }: { days?: number }) {
	const { data, isLoading, isError, refetch } = useQuery<AuditRow[]>({
		queryKey: ["active-users", days],
		queryFn: async () => {
			// Pull a generous window of successful logins.
			const d = await fetchAdminJson<{
				ok?: boolean;
				data?: { rows?: AuditRow[] };
			}>(`/api/admin/audit?action=user.login&result=success&limit=1000`);
			return d.data?.rows ?? [];
		},
	});
	const { v, themeKey } = useThemeTokens();

	const rows = data ?? [];

	// Bucket into the last `days` days, counting distinct actors per day.
	const byDay = new Map<string, Set<string>>();
	const today = new Date();
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		byDay.set(d.toISOString().slice(0, 10), new Set());
	}
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
	);
}
