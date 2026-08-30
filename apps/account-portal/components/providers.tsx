"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { ElectronManualSignInToast } from "@/app/(auth)/sign-in/_components/electron";
import { getQueryClient } from "@/data/query-client";
import { authClient } from "@/lib/auth-client";
import type { Locale } from "@/lib/i18n";
import { I18nProvider } from "./i18n-provider";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

// Spec: Vercel design is light-first. Default theme = "light".
const Providers = ({
	children,
	initialLocale,
}: {
	children: React.ReactNode;
	initialLocale: Locale;
}) => {
	const queryClient = getQueryClient();

	useEffect(() => {
		try {
			const authorizationCode = authClient.electron.getAuthorizationCode();
			if (authorizationCode) {
				setTimeout(() => {
					toast.custom(
						(t) => (
							<ElectronManualSignInToast
								t={t}
								authorizationCode={authorizationCode}
							/>
						),
						{
							duration: 4_000,
						},
					);
				}, 1000);
			}
		} catch (_error) {
			// Silently ignore electron-related errors in web context
		}
	}, []);
	useEffect(() => {
		try {
			const id = authClient.ensureElectronRedirect();
			return () => clearInterval(id);
		} catch (_error) {
			// Silently ignore electron-related errors in web context
		}
	}, []);

	return (
		<I18nProvider initialLocale={initialLocale}>
			<ThemeProvider attribute="class" defaultTheme="light">
				<QueryClientProvider client={queryClient}>
					{/* Devtools are dev-only — keep out of production bundle. */}
					{process.env.NODE_ENV === "development" && <DevtoolsLazy />}
					<Toaster richColors closeButton />
					{children}
				</QueryClientProvider>
			</ThemeProvider>
		</I18nProvider>
	);
};

// Lazy-loaded devtools (only resolved in dev builds).
function DevtoolsLazy() {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { ReactQueryDevtools } = require("@tanstack/react-query-devtools");
	const { getQueryClient } = require("@/data/query-client");
	return (
		<ReactQueryDevtools
			client={getQueryClient()}
			initialIsOpen={false}
			buttonPosition="bottom-right"
			position="bottom"
		/>
	);
}

export default Providers;
