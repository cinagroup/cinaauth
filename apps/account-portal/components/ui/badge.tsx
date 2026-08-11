import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	// Spec: badge-secondary — rounded-full, px-2, caption (12px/400), no border.
	"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				// Primary badge — ink bg, white text (for "New", "Beta" pills on dark).
				default: "bg-primary text-primary-foreground",
				// Spec: badge-secondary — canvas-soft bg, body text.
				secondary: "bg-canvas-soft text-body",
				destructive: "bg-destructive text-destructive-foreground",
				// Outline keeps hairline border for informational badges.
				outline: "border border-hairline text-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
