"use client";

import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { ChartState } from "@/components/charts/chart-state";
import { useThemeTokens } from "@/hooks/use-theme-tokens";

/**
 * Login-channel distribution pie (email/password, github, siwe). Colors read
 * theme tokens; `themeKey` forces a remount on theme switch so recharts
 * re-tints slices + tooltip.
 */
export function ChannelPie({ channels }: { channels: Record<string, number> }) {
	const { v, themeKey } = useThemeTokens();
	const data = [
		{ name: "Email", value: channels.emailPassword ?? 0 },
		{ name: "GitHub", value: channels.github ?? 0 },
		{ name: "SIWE", value: channels.siwe ?? 0 },
	].filter((d) => d.value > 0);

	const COLORS = [
		v("--chart-1", "#0070f3"),
		v("--chart-2", "#7928ca"),
		v("--chart-4", "#e43f8f"),
	];

	if (data.length === 0) {
		return <ChartState status="empty" />;
	}

	return (
		<ResponsiveContainer width="100%" height={240}>
			<PieChart key={themeKey}>
				<Pie
					data={data}
					dataKey="value"
					nameKey="name"
					cx="50%"
					cy="50%"
					outerRadius={80}
					label
				>
					{data.map((_, i) => (
						<Cell key={i} fill={COLORS[i % COLORS.length]} />
					))}
				</Pie>
				<Tooltip
					contentStyle={{
						background: v("--canvas", "#fff"),
						border: `1px solid ${v("--hairline", "#ebebeb")}`,
						borderRadius: "6px",
						color: v("--ink", "#171717"),
					}}
				/>
				<Legend wrapperStyle={{ color: v("--body", "#4d4d4d") }} />
			</PieChart>
		</ResponsiveContainer>
	);
}
