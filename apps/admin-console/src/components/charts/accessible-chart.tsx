import type { ReactNode } from "react";

/** Expose a text equivalent while keeping the decorative chart SVG silent. */
export function AccessibleChart({
	label,
	summary,
	children,
}: {
	label: string;
	summary: string;
	children: ReactNode;
}) {
	return (
		<div role="img" aria-label={label}>
			<span className="sr-only">{summary}</span>
			<div aria-hidden>{children}</div>
		</div>
	);
}
