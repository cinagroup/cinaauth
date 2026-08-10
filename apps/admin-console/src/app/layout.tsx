import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import "./globals.css";

export const metadata: Metadata = {
	title: "CinaGroup Admin",
	description: "CinaGroup user & audit management console",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			suppressHydrationWarning
		>
			<body>
				<ThemeProvider>
					<I18nProvider>
						<QueryProvider>{children}</QueryProvider>
					</I18nProvider>
					<Toaster
						position="bottom-right"
						toastOptions={{
							classNames: {
								toast:
									"rounded-[var(--radius-md)] border border-hairline bg-canvas text-ink shadow-modal font-sans",
							},
						}}
					/>
				</ThemeProvider>
			</body>
		</html>
	);
}
