export type TwoFactorVerificationOutcome = "session" | "redirect" | "invalid";

/** Classifies the only two response shapes that represent successful 2FA. */
export function classifyTwoFactorVerificationData(
	data: unknown,
): TwoFactorVerificationOutcome {
	if (typeof data !== "object" || data === null) return "invalid";
	if (
		"token" in data &&
		typeof data.token === "string" &&
		data.token.length > 0
	) {
		return "session";
	}
	if (
		"redirect" in data &&
		data.redirect === true &&
		"url" in data &&
		typeof data.url === "string" &&
		data.url.length > 0
	) {
		return "redirect";
	}
	return "invalid";
}

/** Formats one-time backup codes for copying or downloading. */
export function formatBackupCodesText(codes: readonly string[]) {
	return [
		"CinaSeek Accounts backup codes",
		"Store these codes securely. Each code can be used only once.",
		"",
		...codes,
	].join("\n");
}

/** Returns a safe user-facing error without assuming an error implementation. */
export function getTwoFactorErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message.trim().length > 0
		? error.message
		: fallback;
}
