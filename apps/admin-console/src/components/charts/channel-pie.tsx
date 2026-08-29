"use client";

import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { AccessibleChart } from "@/components/charts/accessible-chart";
import { ChartState } from "@/components/charts/chart-state";
import { useThemeTokens } from "@/hooks/use-theme-tokens";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * Linked-account provider distribution. Colors read theme tokens; `themeKey`
 * forces a remount on theme switch so recharts re-tints slices + tooltip.
 */
export function ChannelPie({ channels }: { channels: Record<string, number> }) {
	const { v, themeKey } = useThemeTokens();
	const { t } = useI18n();
	const knownProviderLabels: Record<string, string> = {
		emailPassword: t("dashboard.channel.emailPassword"),
		google: t("dashboard.channel.google"),
		github: t("dashboard.channel.github"),
		siwe: t("dashboard.channel.siwe"),
	};
	const data = Object.entries(channels)
		.filter(([, value]) => Number.isFinite(value) && value > 0)
		.map(([provider, value]) => ({
			provider,
			name:
				knownProviderLabels[provider] ??
				provider
					.replace(/[-_]+/g, " ")
					.replace(/\b\w/g, (char) => char.toUpperCase()),
			value,
		}));

	const COLORS = [
		v("--chart-1", "#0070f3"),
		v("--chart-2", "#7928ca"),
		v("--chart-3", "#50e3c2"),
		v("--chart-4", "#e43f8f"),
		v("--chart-5", "#f5a623"),
		v("--chart-6", "#8b5cf6"),
	];

	if (data.length === 0) {
		return <ChartState status="empty" />;
	}

	return (
		<AccessibleChart
			label={t("dashboard.channelDist")}
			summary={data.map((item) => `${item.name}: ${item.value}`).join(", ")}
		>
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
						{data.map((item, index) => (
							<Cell key={item.provider} fill={COLORS[index % COLORS.length]} />
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
		</AccessibleChart>
	);
}
