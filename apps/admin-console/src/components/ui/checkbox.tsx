"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(
			"peer group inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 max-sm:h-11 max-sm:w-11 max-sm:rounded-[var(--radius-sm)]",
			className,
		)}
		{...props}
	>
		<span className="flex h-4 w-4 items-center justify-center rounded-[var(--radius-xs)] border border-hairline-strong bg-canvas group-data-[state=checked]:border-ink group-data-[state=checked]:bg-ink group-data-[state=checked]:text-canvas">
			<CheckboxPrimitive.Indicator
				className={cn("flex items-center justify-center text-current")}
			>
				<Check size={12} strokeWidth={3} />
			</CheckboxPrimitive.Indicator>
		</span>
	</CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
