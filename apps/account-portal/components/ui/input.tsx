import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const inputVariants = cva(
	// Spec: form-input base — canvas bg, hairline border, rounded-sm (6px), shadow-l1.
	"border-input file:text-foreground placeholder:text-mute selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 border bg-canvas shadow-l1 transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
	{
		variants: {
			size: {
				// Spec: form-input-sm — h-8 (32px).
				sm: "h-8 rounded-sm px-2 text-xs",
				// Spec: form-input — h-10 (40px), body-sm (14px).
				default: "h-10 rounded-sm px-3 text-sm",
				// Spec: form-input-lg — h-12 (48px), body-md (16px).
				lg: "h-12 rounded-sm px-3 text-base",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

export interface InputProps
	extends Omit<React.ComponentProps<"input">, "size">,
		VariantProps<typeof inputVariants> {
	asChild?: boolean;
}

function Input({
	className,
	type,
	size,
	asChild = false,
	...props
}: InputProps) {
	const Comp = asChild ? Slot : "input";
	return (
		<Comp
			type={type}
			data-slot="input"
			className={cn(
				inputVariants({ size }),
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
				"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
				className,
			)}
			{...props}
		/>
	);
}

export { Input, inputVariants };
