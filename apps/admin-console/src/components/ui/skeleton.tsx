import { cn } from "@/lib/cn";

/** Loading placeholder — canvas-soft-2 pulse, per DESIGN.md empty-state. */
function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("animate-pulse rounded-[var(--radius-sm)] bg-canvas-soft-2", className)}
			{...props}
		/>
	);
}

export { Skeleton };
