/**
 * Small KPI card. Label in the mono caption-eyebrow voice, value set in the
 * display scale (DESIGN.md `display-md` weight 600 ink).
 *
 * Optional BAC-style trend chrome:
 *  - `delta`: signed percent change (e.g. -29.3). Positive tints success, a
 *    negative delta is neutral/soft (a drop isn't always bad for e.g. failed
 *    logins, so we avoid alarming red here — the sign carries the meaning).
 *  - `deltaLabel`: the comparison context ("vs last week", "on Jul 9", …).
 *  - `spark`: a short numeric series rendered as an inline sparkline.
 */
import {
	TrendingDown,
	TrendingUp,
	type LucideIcon,
} from "lucide-react";

export function StatCard({
	label,
	value,
	hint,
	delta,
	deltaLabel,
	spark,
	icon: Icon,
	tone = "default",
}: {
	label: string;
	value: number | string;
	hint?: string;
	delta?: number;
	deltaLabel?: string;
	spark?: number[];
	icon?: LucideIcon;
	tone?: "default" | "info" | "success" | "warning" | "danger";
}) {
	const hasDelta = typeof delta === "number" && Number.isFinite(delta);
	const up = (delta ?? 0) >= 0;
	const toneClass = {
		default: "text-mute",
		info: "text-link",
		success: "text-success",
		warning: "text-warning",
		danger: "text-error",
	}[tone];

	return (
		<div className="flex min-h-[108px] items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-hairline bg-canvas p-4 shadow-card sm:p-5">
			<div className="min-w-0">
				<div className="text-[13px] leading-5 text-body">
					{label}
				</div>
				<div className="mt-2 text-[26px] font-semibold leading-8 text-ink">
					{value}
				</div>
				{hasDelta && (
					<div className="mt-1 flex items-center gap-1 text-[12px] leading-4">
						<span
							className={`inline-flex items-center gap-0.5 ${up ? "text-success" : "text-error"}`}
						>
							{up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
							{up ? "+" : ""}
							{delta!.toFixed(1)}%
						</span>
						{deltaLabel && <span className="text-mute">{deltaLabel}</span>}
					</div>
				)}
				{!hasDelta && hint && (
					<div className="mt-1 text-[12px] leading-4 text-mute">{hint}</div>
				)}
			</div>
			<div className="flex shrink-0 items-start gap-2">
				{spark && spark.length > 1 && (
					<div className="hidden xl:block">
						<Sparkline data={spark} />
					</div>
				)}
				{Icon && <Icon size={18} strokeWidth={2} className={toneClass} />}
			</div>
		</div>
	);
}

/** Inline sparkline — tiny SVG polyline, no recharts overhead. */
function Sparkline({ data }: { data: number[] }) {
	const w = 72;
	const h = 36;
	const max = Math.max(...data, 1);
	const min = Math.min(...data, 0);
	const span = max - min || 1;
	const step = w / (data.length - 1);
	const pts = data.map((d, i) => `${(i * step).toFixed(1)},${(h - ((d - min) / span) * h).toFixed(1)}`).join(" ");
	const stroke = "var(--chart-1)";
	return (
		<svg width={w} height={h} className="shrink-0 opacity-80" aria-hidden>
			<polyline
				points={pts}
				fill="none"
				stroke={stroke}
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle
				cx={(w).toFixed(1)}
				cy={(h - ((data[data.length - 1] - min) / span) * h).toFixed(1)}
				r={2}
				fill={stroke}
			/>
		</svg>
	);
}
