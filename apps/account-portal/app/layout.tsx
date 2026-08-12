import "./globals.css";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Providers from "@/components/providers";
import { SiteChrome } from "@/components/site-chrome";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
	title: {
		template: "%s | CinaSeek",
		default: "CinaSeek Accounts",
	},
	description:
		"Secure access to your CinaSeek account and connected applications.",
	metadataBase: new URL("https://accounts.cinaseek.ai"),
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
				<link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
				<link rel="manifest" href="/favicon/site.webmanifest" />
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
					<SiteChrome>{children}</SiteChrome>
				</Providers>
			</body>
		</html>
	);
}
