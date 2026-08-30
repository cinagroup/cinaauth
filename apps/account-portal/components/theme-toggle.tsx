"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle({
	label = "Toggle color theme",
}: {
	label?: string;
}) {
	const { setTheme, resolvedTheme } = useTheme();

	return (
		<Button
			variant="outline"
			size="icon"
			type="button"
			aria-label={label}
			title={label}
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
			suppressHydrationWarning
		>
			<Sun aria-hidden className="dark:hidden" />
			<Moon aria-hidden className="hidden dark:block" />
		</Button>
	);
}
