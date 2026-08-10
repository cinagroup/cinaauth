"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Read CSS custom properties from `:root`, re-reading whenever the resolved
 * theme changes so charts (recharts) re-tint in dark/light.
 *
 * Returns a `v(name, fallback)` helper bound to the current theme, plus a
 * numeric `version` that bumps on theme change (use as a `key` to force
 * recharts children to remount if needed).
 *
 * SSR-safe: returns the fallback until mounted.
 */
export function useThemeTokens() {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// Re-run whenever resolvedTheme flips (dark/light/system resolve).
	const themeKey = mounted ? resolvedTheme ?? "dark" : "ssr";

	const v = (name: string, fallback: string) => {
		if (typeof window === "undefined") return fallback;
		const css = getComputedStyle(document.documentElement);
		return css.getPropertyValue(name).trim() || fallback;
	};

	return { v, themeKey };
}
