"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { LazyBackgroundRippleEffect } from "@/components/lazy-background-ripple";
import {
	isAuthenticationPath,
	isDashboardPath,
} from "@/lib/dashboard-navigation";

export function SiteChrome({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	if (isDashboardPath(pathname)) return children;
	if (isAuthenticationPath(pathname)) {
		return (
			<main id="main" className="min-h-screen">
				{children}
			</main>
		);
	}
	if (pathname === "/") {
		return (
			<main id="main" className="min-h-screen">
				{children}
			</main>
		);
	}

	return (
		<div className="flex min-h-screen flex-col">
			<Header />
			<div className="relative mt-16 flex-1">
				<div aria-hidden className="pointer-events-none absolute inset-0 z-0">
					<LazyBackgroundRippleEffect />
				</div>
				<main
					id="main"
					className="relative z-10 mx-auto w-full max-w-[1400px] px-4 md:px-6"
				>
					{children}
				</main>
			</div>
			<Footer />
		</div>
	);
}
