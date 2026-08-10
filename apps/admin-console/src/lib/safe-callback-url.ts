export function safeCallbackURL(raw: string | null): string {
	if (!raw) return "/dashboard";

	// Browsers strip control characters before navigating, which can turn a
	// seemingly relative value into a protocol-relative cross-origin URL.
	// eslint-disable-next-line no-control-regex
	if (/[\u0000-\u001f\u007f]/.test(raw)) return "/dashboard";

	if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) {
		return raw;
	}

	try {
		const url = new URL(raw);
		if (url.origin === window.location.origin) {
			return url.pathname + url.search + url.hash;
		}
	} catch {
		// Invalid absolute URLs use the safe default below.
	}

	return "/dashboard";
}
