import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
	// caption typography + pill shape, per badge-secondary spec.
	"inline-flex items-center rounded-full px-2 text-[12px] leading-4 font-normal whitespace-nowrap",
	{
			variants: {
				variant: {
					// canvas-soft + body text — the default metadata pill.
					default: "bg-canvas-soft text-body",
					outline: "border border-hairline text-body",
					success: "bg-success-soft text-success",
					warning: "bg-warning-soft text-warning",
					danger: "bg-error-soft text-error",
					muted: "bg-canvas-soft-2 text-mute",
				},
			},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof badgeVariants> {}

/**
 * Back-compat: the previous black-gold Badge accepted `"gold"` as a variant.
 * It's collapsed to the default canvas-soft pill here so legacy call-sites
 * keep compiling while re-skinning automatically.
 */
function Badge({ className, variant, ...props }: BadgeProps) {
	const resolved = (variant as string) === "gold" ? "default" : variant;
	return (
		<span
			className={cn(badgeVariants({ variant: resolved }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
