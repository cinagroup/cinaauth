/**
 * Tiny synchronous i18n dictionary — no i18next runtime.
 *
 * react-i18next's init is async, so under Next.js App Router SSR (edge) the
 * `t()` from useTranslation returned raw keys until the client hydrated —
 * producing "nav.overview" / "common.signOut" in the server-rendered HTML.
 *
 * This module is a plain object lookup: deterministic on server and client,
 * zero async, zero hydration mismatch. Language switching via a React
 * context swaps the active dictionary (see I18nProvider).
 */
import zh from "./locales/zh.json";
import en from "./locales/en.json";

export type Lang = "zh" | "en";

export const DICTIONARIES: Record<Lang, Record<string, string>> = {
	zh: zh as Record<string, string>,
	en: en as Record<string, string>,
};

export const DEFAULT_LANG: Lang = "zh";

/** Resolve a dot-path key against a flat dictionary (keys are flat, e.g.
 *  "nav.overview" is a literal key, not nested). Falls back to the key. */
export function translate(
	lang: Lang,
	key: string,
	vars?: Record<string, string | number>,
): string {
	const dict = DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANG];
	let str = dict[key] ?? key;
	if (vars) {
		for (const [k, val] of Object.entries(vars)) {
			str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(val));
		}
	}
	return str;
}
