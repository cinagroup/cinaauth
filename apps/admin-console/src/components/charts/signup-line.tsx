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
import { ChartState } from "@/components/charts/chart-state";
import { useThemeTokens } from "@/hooks/use-theme-tokens";

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
	if (data.length === 0) return <ChartState status="empty" />;

	return (
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
	);
}
