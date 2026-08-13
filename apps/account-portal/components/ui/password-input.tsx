"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PasswordInput = ({
	ref,
	className,
	disabled,
	...props
}: React.ComponentProps<typeof Input>) => {
	const [showPassword, setShowPassword] = React.useState(false);

	return (
		<div className="relative">
			<Input
				{...props}
				type={showPassword ? "text" : "password"}
				className={cn("hide-password-toggle pr-10", className)}
				disabled={disabled}
				ref={ref}
			/>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
				onClick={() => setShowPassword((prev) => !prev)}
				disabled={disabled}
				aria-pressed={showPassword}
				aria-label={showPassword ? "Hide password" : "Show password"}
			>
				{showPassword ? (
					<EyeOffIcon className="h-4 w-4" aria-hidden="true" />
				) : (
					<EyeIcon className="h-4 w-4" aria-hidden="true" />
				)}
			</Button>

			{/* hides browsers password toggles */}
			<style>{`
                .hide-password-toggle::-ms-reveal,
                .hide-password-toggle::-ms-clear {
                    visibility: hidden;
                    pointer-events: none;
                    display: none;
                }
            `}</style>
		</div>
	);
};
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
