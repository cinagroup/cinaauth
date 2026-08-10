"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { DEFAULT_LANG, DICTIONARIES, translate, type Lang } from "./dictionary";

const STORAGE_KEY = "cinaadmin.lang";

interface I18nCtx {
	lang: Lang;
	setLang: (l: Lang) => void;
	t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx>({
	lang: DEFAULT_LANG,
	setLang: () => {},
	t: (key) => key,
});

/**
 * Provides the active language + a synchronous `t()` to the whole shell.
 *
 * SSR-safe: initial state is DEFAULT_LANG (so server and first client render
 * agree → no hydration mismatch); the persisted choice from localStorage is
 * applied in an effect after mount. `t()` always resolves against the active
 * dictionary, with a module-level fallback so even components rendered before
 * the provider mounts still translate rather than returning raw keys.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

	// Apply any persisted language choice after mount (client-only).
	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
			if (saved && saved in DICTIONARIES && saved !== lang) {
				setLangState(saved);
			}
		} catch {
			/* localStorage may be unavailable */
		}
	}, [lang]);

	useEffect(() => {
		document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
	}, [lang]);

	const setLang = useCallback((l: Lang) => {
		setLangState(l);
		try {
			localStorage.setItem(STORAGE_KEY, l);
		} catch {
			/* ignore */
		}
	}, []);

	const value = useMemo<I18nCtx>(
		() => ({
			lang,
			setLang,
			t: (key: string, vars?: Record<string, string | number>) =>
				translate(lang, key, vars),
		}),
		[lang, setLang],
	);
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Hook: `const { t, lang, setLang } = useI18n()`. Synchronous — SSR-safe. */
export function useI18n(): I18nCtx {
	const ctx = useContext(Ctx);
	return {
		...ctx,
		t: (key: string, vars?: Record<string, string | number>) =>
			translate(ctx.lang ?? DEFAULT_LANG, key, vars),
	};
}
