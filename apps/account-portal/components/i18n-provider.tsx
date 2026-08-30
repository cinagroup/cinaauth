"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { Locale, Messages } from "@/lib/i18n";
import {
	homeMessages,
	LOCALE_COOKIE_NAME,
	LOCALE_STORAGE_KEY,
} from "@/lib/i18n";

type I18nContextValue = {
	locale: Locale;
	messages: Messages;
	setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
	children,
	initialLocale,
}: {
	children: React.ReactNode;
	initialLocale: Locale;
}) {
	const [locale, setLocaleState] = useState<Locale>(initialLocale);

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	const setLocale = useCallback((nextLocale: Locale) => {
		setLocaleState(nextLocale);
		document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
		try {
			window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
		} catch {
			// The locale cookie remains canonical when browser storage is blocked.
		}
	}, []);

	const value = useMemo<I18nContextValue>(
		() => ({ locale, messages: homeMessages[locale], setLocale }),
		[locale, setLocale],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error("useI18n must be used within I18nProvider");
	}
	return context;
}
