import { cn } from "@/lib/cn";

/**
 * Empty / loading state frame — generous canvas-soft padding with a muted
 * caption (DESIGN.md `ex-empty-state-card`).
 */
export function EmptyState({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] bg-canvas-soft px-6 py-12 text-center text-[16px] leading-6 text-mute",
				className,
			)}
		>
			{children}
		</div>
	);
}
