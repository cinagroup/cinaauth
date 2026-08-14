import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CAPABILITIES_URL =
	"https://auth.cinaseek.ai/api/auth/capabilities";

const parseCanonicalHttpsOrigin = (name, value) => {
	if (typeof value !== "string" || !value || value.trim() !== value) {
		throw new Error(`${name} must be an exact canonical HTTPS origin`);
	}
	let url;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`${name} must be an exact canonical HTTPS origin`);
	}
	if (
		url.protocol !== "https:" ||
		url.username ||
		url.password ||
		url.port ||
		url.pathname !== "/" ||
		url.search ||
		url.hash ||
		url.origin !== value
	) {
		throw new Error(`${name} must be an exact canonical HTTPS origin`);
	}
	return url.origin;
};

export const resolveAccountBuildReadinessTarget = ({
	targetOrigin,
	readinessUrl,
}) => {
	let resolvedTargetOrigin = targetOrigin;
	if (resolvedTargetOrigin === undefined && typeof readinessUrl === "string") {
		let parsedReadiness;
		try {
			parsedReadiness = new URL(readinessUrl);
		} catch {
			throw new Error(
				"CINAAUTH_ACCOUNT_BUILD_READINESS_URL must identify a valid deployment target",
			);
		}
		resolvedTargetOrigin = parsedReadiness.origin;
	}

	const origin = parseCanonicalHttpsOrigin(
		"CINAAUTH_ACCOUNT_TARGET_ORIGIN",
		resolvedTargetOrigin,
	);
	const expectedReadinessUrl = `${origin}/api/build-readiness`;
	if (readinessUrl !== undefined && readinessUrl !== expectedReadinessUrl) {
		throw new Error(
			"CINAAUTH_ACCOUNT_BUILD_READINESS_URL does not belong to the validated deployment target",
		);
	}
	return expectedReadinessUrl;
};

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

const REOWN_PROJECT_ID = /^[a-fA-F0-9]{32}$/;

export const evaluateReownBuild = ({ siweEnabled, reownProjectId }) => {
	if (!siweEnabled) {
		return {
			ok: true,
			reason: "the production Auth Worker does not advertise SIWE",
		};
	}
	const projectId =
		typeof reownProjectId === "string" ? reownProjectId.trim() : undefined;
	if (
		!projectId ||
		projectId !== reownProjectId ||
		!REOWN_PROJECT_ID.test(projectId)
	) {
		return {
			ok: false,
			reason:
				"the production Auth Worker advertises SIWE but the account build has no valid REOWN_PROJECT_ID",
		};
	}
	return {
		ok: true,
		reason: "the SIWE server and Reown client build are enabled",
	};
};

export const evaluatePlannedReownBuild = ({ siweEnabled, reownProjectId }) => {
	if (siweEnabled !== "true" && siweEnabled !== "false") {
		return {
			ok: false,
			reason:
				"the planned Auth Worker CINAAUTH_SIWE_ENABLED value must be exactly true or false",
		};
	}
	if (siweEnabled === "false") {
		return {
			ok: true,
			reason: "the planned Auth Worker keeps SIWE disabled",
		};
	}
	const result = evaluateReownBuild({
		siweEnabled: siweEnabled === "true",
		reownProjectId,
	});
	if (!result.ok) {
		return {
			ok: false,
			reason:
				"the planned Auth Worker enables SIWE but production has no exact 32-hex REOWN_PROJECT_ID",
		};
	}
	return {
		ok: true,
		reason: "the planned SIWE server and Reown client build are paired",
	};
};

export const evaluateDeployedWalletReadiness = ({
	deployedReadiness,
	cacheControl,
	reownProjectId,
}) => {
	if (!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cacheControl ?? "")) {
		return {
			ok: false,
			reason: "the deployed Account Portal readiness marker is not no-store",
		};
	}
	if (
		typeof deployedReadiness !== "object" ||
		deployedReadiness === null ||
		deployedReadiness.schemaVersion !== 1 ||
		deployedReadiness.ready !== true ||
		deployedReadiness.siweProtocol !== "cinaauth-siwe-v2" ||
		deployedReadiness.walletUi !== "reown-appkit-v1"
	) {
		return {
			ok: false,
			reason:
				"the deployed Account Portal does not advertise the SIWE v2 Reown bundle",
		};
	}
	if (deployedReadiness.reownProjectId !== reownProjectId) {
		return {
			ok: false,
			reason:
				"the deployed Account Portal Reown Project ID does not match production",
		};
	}
	return {
		ok: true,
		reason: "the deployed Account Portal has the matching SIWE v2 Reown bundle",
	};
};

export const evaluatePlannedSiweRelease = ({
	siweEnabled,
	reownProjectId,
	deployedReadiness,
	cacheControl,
}) => {
	const planned = evaluatePlannedReownBuild({
		siweEnabled,
		reownProjectId,
	});
	if (!planned.ok || siweEnabled === "false") return planned;
	return evaluateDeployedWalletReadiness({
		deployedReadiness,
		cacheControl,
		reownProjectId,
	});
};

const readPlannedSiweEnabled = (configPath) => {
	const config = JSON.parse(readFileSync(resolve(configPath), "utf8"));
	return config?.vars?.CINAAUTH_SIWE_ENABLED;
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

const fetchBuildReadiness = async (url) => {
	let lastError;
	for (let attempt = 1; attempt <= 3; attempt += 1) {
		try {
			const response = await fetch(url, {
				cache: "no-store",
				headers: { Accept: "application/json" },
				signal: AbortSignal.timeout(10_000),
			});
			if (!response.ok) {
				throw new Error(
					`Account Portal build readiness returned HTTP ${response.status}`,
				);
			}
			return {
				deployedReadiness: await response.json(),
				cacheControl: response.headers.get("cache-control"),
			};
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
	const plannedWorkerConfig = process.env.CINAAUTH_PLANNED_WORKER_CONFIG;
	if (plannedWorkerConfig) {
		const siweEnabled = readPlannedSiweEnabled(plannedWorkerConfig);
		const reownProjectId = process.env.REOWN_PROJECT_ID;
		const plannedBuild = evaluatePlannedReownBuild({
			siweEnabled,
			reownProjectId,
		});
		if (!plannedBuild.ok) throw new Error(plannedBuild.reason);

		let deployed = {};
		if (siweEnabled === "true") {
			const readinessURL = resolveAccountBuildReadinessTarget({
				targetOrigin: process.env.CINAAUTH_ACCOUNT_TARGET_ORIGIN,
				readinessUrl: process.env.CINAAUTH_ACCOUNT_BUILD_READINESS_URL,
			});
			deployed = await fetchBuildReadiness(readinessURL);
		}
		const plannedResult = evaluatePlannedSiweRelease({
			siweEnabled,
			reownProjectId: process.env.REOWN_PROJECT_ID,
			...deployed,
		});
		if (!plannedResult.ok) throw new Error(plannedResult.reason);
		console.log(
			`Planned Account identity build parity passed: ${plannedResult.reason}.`,
		);
		return;
	}

	const url = process.env.CINAAUTH_CAPABILITIES_URL || DEFAULT_CAPABILITIES_URL;
	const capabilities = await fetchCapabilities(url);
	const oneTapResult = evaluateOneTapBuild({
		oneTapEnabled:
			typeof capabilities === "object" &&
			capabilities !== null &&
			capabilities.oneTap === true,
		googleClientId: process.env.GOOGLE_CLIENT_ID,
	});
	if (!oneTapResult.ok) throw new Error(oneTapResult.reason);
	const reownResult = evaluateReownBuild({
		siweEnabled:
			typeof capabilities === "object" &&
			capabilities !== null &&
			typeof capabilities.methods === "object" &&
			capabilities.methods !== null &&
			capabilities.methods.siwe === true,
		reownProjectId: process.env.REOWN_PROJECT_ID,
	});
	if (!reownResult.ok) throw new Error(reownResult.reason);
	console.log(
		`Account identity build parity passed: ${oneTapResult.reason}; ${reownResult.reason}.`,
	);
};

if (
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
	main().catch((error) => {
		console.error(
			`Account identity build parity failed: ${error instanceof Error ? error.message : "unknown error"}`,
		);
		process.exitCode = 1;
	});
}
