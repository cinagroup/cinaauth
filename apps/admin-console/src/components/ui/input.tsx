import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Text input — 40px tall, hairline border, 6px radius (the brand's
 * --geist-form-height / --geist-radius). Replaces the repeated
 * `rounded border border-hairline bg-canvas-800 px-3 py-2` inline classes.
 */
const Input = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => {
	return (
		<input
			type={type}
			ref={ref}
			className={cn(
				"flex h-10 w-full rounded-[var(--radius-sm)] border border-hairline bg-canvas px-3 text-[14px] leading-5 text-ink placeholder:text-mute max-sm:h-11 focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] aria-invalid:border-error aria-invalid:outline-error disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
});
Input.displayName = "Input";

export { Input };
