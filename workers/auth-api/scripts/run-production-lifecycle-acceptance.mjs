import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://auth.cinaseek.ai";
const ADMIN_ORIGIN = "https://admin.cinaseek.ai";
const ALLOWED_BASE_URLS = new Set([
	DEFAULT_BASE_URL,
	"https://accounts.cinaseek.ai",
]);

const isRecord = (value) =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const required = (env, name) => {
	const value = env[name]?.trim();
	if (!value) throw new Error(`Missing required environment variable ${name}`);
	return value;
};

const normalizeBaseUrl = (input) => {
	const url = new URL(input);
	if (
		url.protocol !== "https:" ||
		url.pathname !== "/" ||
		url.search ||
		url.hash ||
		!ALLOWED_BASE_URLS.has(url.origin)
	) {
		throw new Error(
			"CINAAUTH_PRODUCTION_ACCEPTANCE_URL must be an approved CinaAuth HTTPS origin",
		);
	}
	return url.origin;
};

const validateAdminCookie = (cookie) => {
	if (cookie.length > 8_192 || /[\r\n]/.test(cookie) || !cookie.includes("=")) {
		throw new Error("CINAAUTH_ACCEPTANCE_ADMIN_COOKIE is malformed");
	}
	return cookie;
};

const request = async ({
	fetchImpl,
	baseUrl,
	path,
	method = "GET",
	cookie,
	body,
}) => {
	const response = await fetchImpl(new URL(path, baseUrl), {
		method,
		redirect: "manual",
		signal: AbortSignal.timeout(15_000),
		headers: {
			Accept: "application/json",
			Cookie: cookie,
			Origin: ADMIN_ORIGIN,
			...(body ? { "Content-Type": "application/json" } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const result = await response.json().catch(() => undefined);
	return { response, result };
};

const requireSuccess = ({ response, result }, operation) => {
	if (!response.ok) {
		throw new Error(`${operation} failed with HTTP ${response.status}`);
	}
	if (!isRecord(result)) {
		throw new Error(`${operation} returned an invalid response`);
	}
	return result;
};

const getSetCookies = (headers) => {
	if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
	const combined = headers.get("set-cookie");
	return combined ? [combined] : [];
};

const getImpersonatedSessionCookie = (headers) => {
	for (const setCookie of getSetCookies(headers)) {
		const cookie = setCookie.split(";", 1)[0]?.trim();
		if (
			cookie &&
			/session_token=/i.test(cookie) &&
			!/admin_session=/i.test(cookie)
		) {
			return cookie;
		}
	}
	throw new Error("impersonation did not return a session cookie");
};

const hasSessionForUser = (result, userId) =>
	isRecord(result) &&
	isRecord(result.user) &&
	result.user.id === userId &&
	isRecord(result.session);

/**
 * Exercises a synthetic production user lifecycle through existing admin APIs.
 * The caller supplies a super-admin session cookie; the function never logs or
 * returns the cookie, synthetic email, or impersonation token.
 */
export const runProductionLifecycleAcceptance = async ({
	adminCookie,
	baseUrl = DEFAULT_BASE_URL,
	fetchImpl = fetch,
	randomUUID = crypto.randomUUID,
	onProgress = () => {},
}) => {
	const safeAdminCookie = validateAdminCookie(adminCookie);
	const safeBaseUrl = normalizeBaseUrl(baseUrl);
	const runId = randomUUID();
	const email = `cinaauth-acceptance-${runId}@acceptance.invalid`;
	let userId;
	let impersonatedCookie;
	let primaryError;

	try {
		const created = requireSuccess(
			await request({
				fetchImpl,
				baseUrl: safeBaseUrl,
				path: "/api/auth/admin/create-user",
				method: "POST",
				cookie: safeAdminCookie,
				body: {
					email,
					name: `CinaAuth Acceptance ${runId}`,
					role: "user",
				},
			}),
			"synthetic user creation",
		);
		if (isRecord(created.user) && typeof created.user.id === "string") {
			// Capture the ID before validating the rest of the response so a
			// malformed acknowledgement cannot strand an already-created user.
			userId = created.user.id;
		}
		if (
			!isRecord(created.user) ||
			!userId ||
			created.user.email !== email ||
			created.user.role !== "user"
		) {
			throw new Error("synthetic user creation returned the wrong identity");
		}
		onProgress("synthetic-user-created");

		const impersonatedResponse = await request({
			fetchImpl,
			baseUrl: safeBaseUrl,
			path: "/api/auth/admin/impersonate-user",
			method: "POST",
			cookie: safeAdminCookie,
			body: { userId },
		});
		const impersonated = requireSuccess(
			impersonatedResponse,
			"synthetic user impersonation",
		);
		if (
			!isRecord(impersonated.user) ||
			impersonated.user.id !== userId ||
			!isRecord(impersonated.session) ||
			typeof impersonated.session.impersonatedBy !== "string"
		) {
			throw new Error("impersonation returned an invalid session");
		}
		impersonatedCookie = getImpersonatedSessionCookie(
			impersonatedResponse.response.headers,
		);
		onProgress("impersonation-session-issued");

		const activeSession = requireSuccess(
			await request({
				fetchImpl,
				baseUrl: safeBaseUrl,
				path: "/api/auth/get-session",
				cookie: impersonatedCookie,
			}),
			"impersonated session validation",
		);
		if (!hasSessionForUser(activeSession, userId)) {
			throw new Error(
				"impersonated session did not resolve to the synthetic user",
			);
		}
		onProgress("impersonation-session-validated");
	} catch (error) {
		primaryError = error;
	} finally {
		if (userId) {
			try {
				const removed = requireSuccess(
					await request({
						fetchImpl,
						baseUrl: safeBaseUrl,
						path: "/api/auth/admin/remove-user",
						method: "POST",
						cookie: safeAdminCookie,
						body: { userId },
					}),
					"synthetic user cleanup",
				);
				if (removed.success !== true) {
					throw new Error("synthetic user cleanup was not acknowledged");
				}
				onProgress("synthetic-user-removed");
			} catch (cleanupError) {
				throw new AggregateError(
					primaryError ? [primaryError, cleanupError] : [cleanupError],
					`Production lifecycle acceptance cleanup failed for run ${runId}`,
				);
			}
		}
	}

	if (primaryError) throw primaryError;
	if (!userId || !impersonatedCookie) {
		throw new Error("production lifecycle acceptance did not create a session");
	}

	const revokedSession = await request({
		fetchImpl,
		baseUrl: safeBaseUrl,
		path: "/api/auth/get-session",
		cookie: impersonatedCookie,
	});
	if (
		revokedSession.response.ok &&
		hasSessionForUser(revokedSession.result, userId)
	) {
		throw new Error("synthetic user session survived account cleanup");
	}
	onProgress("session-revocation-validated");

	return { runId, cleaned: true };
};

export const runCli = async ({
	argv = process.argv.slice(2),
	env = process.env,
	log = console.log,
} = {}) => {
	if (!argv.includes("--run")) {
		log(
			"Production lifecycle acceptance is dry by default. Set CINAAUTH_ACCEPTANCE_ADMIN_COOKIE and rerun with --run.",
		);
		return;
	}

	const result = await runProductionLifecycleAcceptance({
		adminCookie: required(env, "CINAAUTH_ACCEPTANCE_ADMIN_COOKIE"),
		baseUrl: env.CINAAUTH_PRODUCTION_ACCEPTANCE_URL?.trim() || DEFAULT_BASE_URL,
		onProgress: (step) => log(`${step}: passed`),
	});
	log(`production-lifecycle: passed and cleaned (run ${result.runId})`);
};

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	await runCli();
}
