import type { ReactNode } from "react";

/**
 * Unified toolbar row placed above tables/lists. Left slot holds search
 * inputs and filter selects; right slot holds action buttons (create,
 * export). Replaces the three inconsistent patterns previously spread
 * across pages: shared FilterBar, hand-rolled Select rows, and bare
 * button clusters.
 */
export function Toolbar({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${className ?? ""}`}
		>
			{children}
		</div>
	);
}

/** Left-aligned cluster inside a Toolbar (search + filters). */
export function ToolbarLeft({ children }: { children: ReactNode }) {
	return (
		<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
			{children}
		</div>
	);
}

/** Right-aligned cluster inside a Toolbar (action buttons). */
export function ToolbarRight({ children }: { children: ReactNode }) {
	return (
		<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
			{children}
		</div>
	);
}
