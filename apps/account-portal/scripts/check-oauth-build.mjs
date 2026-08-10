import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CAPABILITIES_URL =
	"https://auth.cinaseek.ai/api/auth/capabilities";

export const evaluateOneTapBuild = ({ oneTapEnabled, googleClientId }) => {
	if (!oneTapEnabled) {
		return {
			ok: true,
			reason: "the production Auth Worker does not advertise One Tap",
		};
	}
	if (!googleClientId || googleClientId.trim().length === 0) {
		return {
			ok: false,
			reason:
				"the production Auth Worker advertises One Tap but the account build has no GOOGLE_CLIENT_ID",
		};
	}
	if (googleClientId.length > 512) {
		return { ok: false, reason: "GOOGLE_CLIENT_ID is unexpectedly long" };
	}
	return {
		ok: true,
		reason: "the One Tap server and client build are enabled",
	};
};

const fetchCapabilities = async (url) => {
	let lastError;
	for (let attempt = 1; attempt <= 3; attempt += 1) {
		try {
			const response = await fetch(url, {
				headers: { Accept: "application/json" },
				signal: AbortSignal.timeout(10_000),
			});
			if (!response.ok) {
				throw new Error(`capability endpoint returned HTTP ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			lastError = error;
			if (attempt < 3) {
				await new Promise((resolveRetry) =>
					setTimeout(resolveRetry, attempt * 500),
				);
			}
		}
	}
	throw lastError;
};

const main = async () => {
	const url = process.env.CINAAUTH_CAPABILITIES_URL || DEFAULT_CAPABILITIES_URL;
	const capabilities = await fetchCapabilities(url);
	const result = evaluateOneTapBuild({
		oneTapEnabled:
			typeof capabilities === "object" &&
			capabilities !== null &&
			capabilities.oneTap === true,
		googleClientId: process.env.GOOGLE_CLIENT_ID,
	});
	if (!result.ok) throw new Error(result.reason);
	console.log(`OAuth build parity passed: ${result.reason}.`);
};

if (
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
	main().catch((error) => {
		console.error(
			`OAuth build parity failed: ${error instanceof Error ? error.message : "unknown error"}`,
		);
		process.exitCode = 1;
	});
}
