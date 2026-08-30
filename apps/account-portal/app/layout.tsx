import "./globals.css";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { LocalizedSkipLink } from "@/components/localized-skip-link";
import Providers from "@/components/providers";
import { SiteChrome } from "@/components/site-chrome";
import { homeMessages } from "@/lib/i18n";
import { createMetadata } from "@/lib/metadata";
import { getRequestLocale } from "@/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getRequestLocale();
	return createMetadata({
		title: {
			template: "%s | CinaSeek",
			default: "CinaSeek Accounts",
		},
		description: homeMessages[locale].metadataDescription,
		metadataBase: new URL("https://accounts.cinaseek.ai"),
	});
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getRequestLocale();
	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<link rel="icon" href="/favicon/favicon.ico" sizes="any" />
				<link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
				<link rel="manifest" href="/favicon/site.webmanifest" />
			</head>
			<body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
				<Providers initialLocale={locale}>
					<LocalizedSkipLink />
					<SiteChrome>{children}</SiteChrome>
				</Providers>
			</body>
		</html>
	);
}
