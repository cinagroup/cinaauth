"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { setTheme, resolvedTheme } = useTheme();

	return (
		<Button
			variant="outline"
			size="icon"
			type="button"
			aria-label="Toggle color theme"
			title="Toggle color theme"
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
			suppressHydrationWarning
		>
			<Sun aria-hidden className="dark:hidden" />
			<Moon aria-hidden className="hidden dark:block" />
		</Button>
	);
}
