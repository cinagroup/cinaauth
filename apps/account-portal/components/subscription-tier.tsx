import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type React from "react";
import { cn } from "@/lib/utils";

const VALID_TIERS = ["free", "plus", "pro"] as const;
type Tier = (typeof VALID_TIERS)[number];

const isValidTier = (tier: string | undefined): tier is Tier => {
	return VALID_TIERS.includes(tier as Tier);
};

const tierVariants = cva(
	// Spec: badge-secondary — rounded-full, px-2, caption (12px/400).
	"inline-flex items-center px-2 py-0.5 text-xs font-normal rounded-full transition-colors",
	{
		variants: {
			variant: {
				free: "bg-canvas-soft text-ink ring-1 ring-hairline",
				plus: "bg-cyan-deep text-white",
				pro: "bg-violet text-white",
			},
		},
		defaultVariants: {
			variant: "free",
		},
	},
);

export interface SubscriptionTierLabelProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof tierVariants> {
	tier?: string;
}

export const SubscriptionTierLabel: React.FC<SubscriptionTierLabelProps> = ({
	tier,
	className,
	...props
}) => {
	const validTier = isValidTier(tier) ? tier : "free";

	return (
		<span
			className={cn(tierVariants({ variant: validTier }), className)}
			{...props}
		>
			{validTier.charAt(0).toUpperCase() + validTier.slice(1)}
		</span>
	);
};
