import "./globals.css";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { LazyBackgroundRippleEffect } from "@/components/lazy-background-ripple";
import Providers from "@/components/providers";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
	title: {
		template: "%s | CinaAuth",
		default: "CinaAuth",
	},
	description: "CinaAuth - 企业级认证授权解决方案",
	metadataBase: new URL("https://demo-auth.cinagroup.com"),
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="icon" href="/favicon/favicon.ico" sizes="any" />
			</head>
			<body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
				{/* Spec: skip-to-content link (a11y). */}
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-canvas focus:text-ink focus:px-3 focus:py-2 focus:rounded-sm focus:shadow-l4 focus:text-sm focus:font-medium"
				>
					Skip to content
				</a>
				<Providers>
					<div className="min-h-screen flex flex-col">
						{/* Site Header */}
						<Header />

						<div className="relative flex-1 mt-16">
							{/* Background Ripple Effect (decorative) */}
							<div
								aria-hidden
								className="absolute inset-0 z-0 pointer-events-none"
							>
								<LazyBackgroundRippleEffect />
							</div>

							{/* Content — spec gutter: 16px mobile, 24px desktop. */}
							<main
								id="main"
								className="relative z-10 max-w-[1400px] w-full px-4 md:px-6 mx-auto"
							>
								{children}
							</main>
						</div>

						{/* Spec: footer landmark. */}
						<Footer />
					</div>
				</Providers>
			</body>
		</html>
	);
}
