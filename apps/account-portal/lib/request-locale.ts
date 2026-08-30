import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, resolveLocale } from "./i18n";

/** Resolve the account portal locale from the persisted preference or request. */
export async function getRequestLocale() {
	const [cookieStore, requestHeaders] = await Promise.all([
		cookies(),
		headers(),
	]);
	return resolveLocale({
		cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
		acceptLanguage: requestHeaders.get("accept-language"),
	});
}
