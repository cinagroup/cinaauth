const WAGMI_COOKIE_PREFIX = "wagmi.store=";
const MAX_WAGMI_COOKIE_LENGTH = 4096;

/** Extracts only Wagmi's public connection state from a request cookie header. */
export const getReownInitialCookie = (cookieHeader: string | null) => {
	if (!cookieHeader) return null;
	const cookie = cookieHeader
		.split(";")
		.map((value) => value.trim())
		.find((value) => value.startsWith(WAGMI_COOKIE_PREFIX));
	if (!cookie || cookie.length > MAX_WAGMI_COOKIE_LENGTH) return null;
	return cookie;
};
