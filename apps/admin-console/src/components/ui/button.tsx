import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors max-sm:min-h-11 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				// Ink-filled primary CTA — the brand's single conversion colour.
				primary:
					"bg-ink text-canvas hover:bg-ink/90 active:bg-ink",
				secondary:
					"bg-canvas text-ink border border-hairline hover:bg-canvas-soft-2",
				outline:
					"bg-transparent text-ink border border-hairline hover:bg-canvas-soft",
				ghost: "bg-transparent text-body hover:bg-canvas-soft-2 hover:text-ink",
				danger: "bg-error text-white hover:bg-error/90 active:bg-error",
				link: "bg-transparent text-link underline-offset-4 hover:underline",
			},
			size: {
				sm: "h-8 rounded-[var(--radius-sm)] px-3 text-[14px] leading-5",
				md: "h-10 rounded-[var(--radius-sm)] px-4 text-[14px] leading-5",
				lg: "h-12 rounded-[var(--radius-sm)] px-5 text-[16px] leading-6",
				icon: "h-9 w-9 rounded-[var(--radius-sm)] max-sm:h-11 max-sm:w-11",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
