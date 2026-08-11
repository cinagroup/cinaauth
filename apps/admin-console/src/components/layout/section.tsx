import type { ReactNode } from "react";

/**
 * Mono eyebrow label — the uppercase caption that groups tiles/charts under
 * a section (mirrors better-auth-console's section headings). Extracted from
 * the dashboard's previously inlined `SectionLabel`.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
	return (
		<h2 className="text-[16px] font-semibold leading-6 text-ink">{children}</h2>
	);
}

/**
 * Vertical content section with an optional eyebrow label. Wraps related
 * tiles/charts/tables so pages compose `<Section label="…">` blocks rather
 * than hand-rolling `<section className="space-y-3">` each time.
 */
export function Section({
	label,
	children,
	className,
}: {
	label?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={`space-y-3 ${className ?? ""}`}>
			{label != null && <SectionLabel>{label}</SectionLabel>}
			{children}
		</section>
	);
}
