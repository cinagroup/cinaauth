"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { AccessibleChart } from "@/components/charts/accessible-chart";
import { ChartState } from "@/components/charts/chart-state";
import { useThemeTokens } from "@/hooks/use-theme-tokens";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * Daily signup trend line chart. Colors read from CSS custom properties so
 * the chart re-tints with the active theme (uses --canvas / --hairline /
 * --body / --accent defined in globals.css). `themeKey` forces a remount on
 * theme switch so recharts picks up the new token values.
 */
export function SignupLine({
	data,
}: {
	data: { date: string; count: number }[];
}) {
	const { v, themeKey } = useThemeTokens();
	const { t } = useI18n();
	if (data.length === 0) return <ChartState status="empty" />;

	return (
		<AccessibleChart
			label={t("dashboard.signupTrend")}
			summary={data.map((point) => `${point.date}: ${point.count}`).join(", ")}
		>
			<ResponsiveContainer width="100%" height={240}>
				<LineChart key={themeKey} data={data}>
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
						contentStyle={{
							background: v("--canvas", "#fff"),
							border: `1px solid ${v("--hairline", "#ebebeb")}`,
							borderRadius: "6px",
							color: v("--ink", "#171717"),
						}}
					/>
					<Line
						type="monotone"
						dataKey="count"
						stroke={v("--chart-1", "#0070f3")}
						strokeWidth={2}
						dot={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</AccessibleChart>
	);
}
