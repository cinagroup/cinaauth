import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				// Spec: button-primary — flat, no drop-shadow. Inset hairline via shadow-inset-hairline.
				default:
					"bg-primary text-primary-foreground shadow-inset-hairline hover:bg-primary/90 active:scale-[0.98]",
				destructive:
					"bg-destructive text-destructive-foreground shadow-inset-hairline hover:bg-destructive/90",
				// Outline uses hairline border (spec: nav-cta-ask-ai style).
				outline:
					"border border-hairline bg-canvas text-ink hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
				// Spec: button-secondary — canvas bg, ink text.
				secondary:
					"bg-canvas text-ink shadow-inset-hairline hover:bg-canvas-soft",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-link underline-offset-4 hover:text-link-deep hover:underline",
			},
			size: {
				// Spec: in-app button = rounded-sm (6px), ≥44px tall for touch target.
				default: "h-11 px-4 py-2",
				sm: "h-9 rounded-sm px-3 text-xs",
				lg: "h-12 rounded-sm px-8 text-base font-medium",
				// Spec: icon-button-circular = rounded-full, 44×44 touch target.
				icon: "h-11 w-11 rounded-full",
				// Spec: button-primary (marketing) = rounded-pill (100px), 48px tall.
				pill: "h-12 px-3 rounded-pill text-base font-medium",
				// Spec: button-primary-sm = rounded-pill, 40px tall.
				"pill-sm": "h-10 px-2 rounded-pill text-sm font-medium",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = ({
	className,
	variant,
	size,
	asChild = false,
	...props
}: ButtonProps) => {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
};
Button.displayName = "Button";

export { Button, buttonVariants };
