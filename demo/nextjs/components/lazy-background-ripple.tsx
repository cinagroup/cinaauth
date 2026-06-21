"use client";

/**
 * Client wrapper that lazy-loads the ripple background with SSR disabled.
 * `next/dynamic`'s `ssr: false` is only permitted inside Client Components,
 * so this wrapper exists to keep the root layout (a Server Component) legal
 * while preserving the original intent (defer the 216-cell grid to client idle).
 */
import dynamic from "next/dynamic";

export const LazyBackgroundRippleEffect = dynamic(
	() =>
		import("@/components/background-ripple-effect").then(
			(mod) => mod.BackgroundRippleEffect,
		),
	{ ssr: false, loading: () => null },
);
