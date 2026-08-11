import type { ErasureConfigurationStatus } from "./configuration";
import { isConfigFailure, validateTargetsForHosts } from "./configuration";
import { getErasureConfigStub } from "./configuration-do";
import type { PrivacyErasureEnv } from "./env";
import type { ManagementAction } from "./management";
import { handleConfigurationAction } from "./management";
import type { ErasureTarget } from "./protocol";
import {
	isProtocolFailure,
	parseTargets,
	readAuthenticatedOperation,
	verifyBearerToken,
} from "./protocol";
import { resolveErasureWebhookSecret } from "./secrets-store-readiness";

export { ErasureConfigDurableObject } from "./configuration-do";
export { ErasureCoordinator } from "./coordinator";

const SERVICE_NAME = "CinaAuth Privacy Erasure";
const ERASE_PATH = "/cinaauth/privacy/erase";
const CONFIG_PATH_PREFIX = "/internal/config/erasure/";
const CONFIG_ACTIONS = new Set<ManagementAction>([
	"status",
	"stage",
	"test",
	"activate",
	"rollback",
]);

const responseHeaders = {
	"Cache-Control": "no-store",
	"Content-Type": "application/json; charset=utf-8",
	Pragma: "no-cache",
	"X-Content-Type-Options": "nosniff",
};

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...responseHeaders, ...headers },
	});

const errorResponse = (code: string, status: number, message: string) =>
	json({ success: false, code, message }, status);

type RuntimeAssessment = {
	structuralReady: boolean;
	operationalReady: boolean;
	source: "dynamic" | "legacy" | "none";
	issues: string[];
	targetIds: string[];
	targets: ErasureTarget[];
	webhookSecret?: string;
	webhookAuthentication: {
		active: true;
		ok: boolean;
		source: "secrets-store-v2" | "worker-secret-v1";
		issues: string[];
	};
	configuration: ErasureConfigurationStatus;
};

const resolveLegacyTargets = (env: PrivacyErasureEnv) => {
	if (!env.CINAAUTH_ERASURE_TARGETS) return [];
	return validateTargetsForHosts(
		parseTargets(env.CINAAUTH_ERASURE_TARGETS),
		env.CINAAUTH_ERASURE_ALLOWED_HOSTS,
	);
};

const assessRuntime = async (
	env: PrivacyErasureEnv,
	resolvedWebhook?: Awaited<ReturnType<typeof resolveErasureWebhookSecret>>,
): Promise<RuntimeAssessment> => {
	const issues: string[] = [];
	let webhookSecret: string | undefined;
	let webhookAuthentication: RuntimeAssessment["webhookAuthentication"];
	try {
		const resolved =
			resolvedWebhook ?? (await resolveErasureWebhookSecret(env));
		webhookSecret = resolved.value;
		webhookAuthentication = {
			active: true,
			ok: true,
			source: resolved.source,
			issues: [],
		};
	} catch (error) {
		const issue =
			error instanceof Error &&
			"issue" in error &&
			typeof error.issue === "string"
				? error.issue
				: "erasure_webhook_secret_store_v2_unavailable";
		issues.push(issue);
		webhookAuthentication = {
			active: true,
			ok: false,
			source: env.CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2
				? "secrets-store-v2"
				: "worker-secret-v1",
			issues: [issue],
		};
	}
	if (
		!env.CINAAUTH_ERASURE_STORAGE_SECRET ||
		env.CINAAUTH_ERASURE_STORAGE_SECRET.length < 32
	) {
		issues.push("storage_secret_missing_or_weak");
	}

	const config = getErasureConfigStub(env);
	let configuration: ErasureConfigurationStatus;
	let encryptionKeyReady = false;
	try {
		configuration = await config.status();
	} catch {
		configuration = {
			revision: 0,
			structuralReady: false,
			operationalReady: false,
			source: "none",
			active: null,
			next: null,
			previous: null,
		};
		issues.push("configuration_store_unavailable");
	}
	let source: RuntimeAssessment["source"] = "none";
	let targets: ErasureTarget[] = [];
	if (configuration.active) {
		try {
			targets = (await config.activeTargets()) ?? [];
			encryptionKeyReady = true;
			if (targets.length > 0) source = "dynamic";
			else issues.push("active_targets_unavailable");
		} catch {
			issues.push("active_targets_unavailable");
			try {
				await config.checkEncryptionKey();
				encryptionKeyReady = true;
			} catch {
				// Classified below without exposing key details.
			}
		}
	} else {
		try {
			await config.checkEncryptionKey();
			encryptionKeyReady = true;
		} catch {
			// Classified below without exposing key details.
		}
	}
	if (!configuration.active && env.CINAAUTH_ERASURE_TARGETS) {
		try {
			targets = resolveLegacyTargets(env);
			if (targets.length > 0) source = "legacy";
			else issues.push("targets_empty");
		} catch {
			issues.push("legacy_targets_invalid_or_disallowed");
		}
	} else if (!configuration.active) {
		issues.push("targets_missing");
	}
	if (!encryptionKeyReady) issues.push("configuration_key_unavailable");

	const structuralReady =
		webhookAuthentication.ok &&
		encryptionKeyReady &&
		!issues.includes("storage_secret_missing_or_weak") &&
		!issues.includes("configuration_store_unavailable");
	const operationalReady =
		structuralReady && targets.length > 0 && source !== "none";
	return {
		structuralReady,
		operationalReady,
		source,
		issues,
		targetIds: targets.map(({ id }) => id),
		targets,
		...(webhookSecret ? { webhookSecret } : {}),
		webhookAuthentication,
		configuration: {
			...configuration,
			structuralReady,
			operationalReady,
			source,
		},
	};
};

const handleReadiness = async (request: Request, env: PrivacyErasureEnv) => {
	const assessment = await assessRuntime(env);
	const authorization = request.headers.get("authorization");
	if (authorization && !assessment.webhookSecret) {
		return errorResponse(
			"ERASURE_WEBHOOK_SECRET_UNAVAILABLE",
			503,
			"Privacy erasure webhook authentication is unavailable",
		);
	}
	const authorized = authorization
		? await verifyBearerToken(authorization, assessment.webhookSecret ?? "")
		: false;
	if (authorization && !authorized) {
		return errorResponse("INVALID_READINESS_TOKEN", 401, "Unauthorized");
	}
	return json(
		{
			success: assessment.operationalReady,
			service: SERVICE_NAME,
			version: env.VERSION_METADATA.id,
			runtimeConfig: {
				ok: assessment.operationalReady,
				structuralReady: assessment.structuralReady,
				operationalReady: assessment.operationalReady,
				source: assessment.source,
				...(authorized
					? {
							issues: assessment.issues,
							targetIds: assessment.targetIds,
							configuration: assessment.configuration,
						}
					: {}),
			},
			...(authorized
				? { webhookAuthentication: assessment.webhookAuthentication }
				: {}),
		},
		assessment.operationalReady ? 200 : 503,
	);
};

const handleErasure = async (request: Request, env: PrivacyErasureEnv) => {
	const resolvedWebhook = await resolveErasureWebhookSecret(env);
	const operation = await readAuthenticatedOperation(
		request,
		resolvedWebhook.value,
	);
	const assessment = await assessRuntime(env, resolvedWebhook);
	if (!assessment.operationalReady || !assessment.webhookSecret) {
		return errorResponse(
			"ERASURE_RUNTIME_NOT_READY",
			503,
			"Privacy erasure runtime is not ready",
		);
	}
	const coordinator = env.ERASURE_COORDINATOR.getByName(operation.operationId);
	const result = await coordinator.processOperation(
		operation,
		assessment.targets,
	);
	if (result.kind === "completed") return json(result.result);
	if (result.kind === "pending") {
		return json(
			{
				status: "pending",
				retryAfterSeconds: result.retryAfterSeconds,
			},
			202,
			{ "Retry-After": String(result.retryAfterSeconds) },
		);
	}
	if (result.kind === "conflict") {
		return errorResponse(
			result.code,
			409,
			"The erasure operation conflicts with persisted coordinator state",
		);
	}
	return errorResponse(
		"ERASURE_TARGET_UNAVAILABLE",
		503,
		"A required erasure target could not confirm erasure",
	);
};

const configurationActionFromPath = (pathname: string) => {
	if (!pathname.startsWith(CONFIG_PATH_PREFIX)) return undefined;
	const action = pathname.slice(CONFIG_PATH_PREFIX.length);
	return CONFIG_ACTIONS.has(action as ManagementAction)
		? (action as ManagementAction)
		: undefined;
};

const handleConfiguration = async (
	action: ManagementAction,
	request: Request,
	env: PrivacyErasureEnv,
) => {
	const result = await handleConfigurationAction(action, request, env);
	if (action !== "status" || !("source" in result)) return json(result);
	const status = result;
	if (status.source !== "none") return json(status);
	let legacyTargets: ErasureTarget[] = [];
	try {
		legacyTargets = resolveLegacyTargets(env);
	} catch {
		// The management response remains fail closed and never exposes target data.
	}
	return json({
		...status,
		operationalReady: status.structuralReady && legacyTargets.length > 0,
		source: legacyTargets.length > 0 ? "legacy" : "none",
	});
};

export default {
	async fetch(
		request: Request,
		env: PrivacyErasureEnv,
		_ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);
		const requestId = crypto.randomUUID();
		try {
			let response: Response;
			const configAction = configurationActionFromPath(url.pathname);
			if (url.pathname === "/" && request.method === "GET") {
				response = json({
					success: true,
					service: SERVICE_NAME,
					version: env.VERSION_METADATA.id,
				});
			} else if (url.pathname === "/ready" && request.method === "GET") {
				response = await handleReadiness(request, env);
			} else if (configAction && request.method === "POST") {
				response = await handleConfiguration(configAction, request, env);
			} else if (url.pathname.startsWith(CONFIG_PATH_PREFIX)) {
				response = json(
					{
						success: false,
						code: configAction ? "METHOD_NOT_ALLOWED" : "NOT_FOUND",
						message: configAction ? "Method not allowed" : "Not found",
					},
					configAction ? 405 : 404,
					configAction ? { Allow: "POST" } : undefined,
				);
			} else if (url.pathname === ERASE_PATH && request.method === "POST") {
				response = await handleErasure(request, env);
			} else if (url.pathname === ERASE_PATH) {
				response = json(
					{
						success: false,
						code: "METHOD_NOT_ALLOWED",
						message: "Method not allowed",
					},
					405,
					{ Allow: "POST" },
				);
			} else {
				response = errorResponse("NOT_FOUND", 404, "Not found");
			}
			console.log(
				JSON.stringify({
					message: "privacy erasure request completed",
					requestId,
					method: request.method,
					path: url.pathname,
					status: response.status,
				}),
			);
			return response;
		} catch (error) {
			const failure =
				isProtocolFailure(error) || isConfigFailure(error)
					? error
					: {
							code: "INTERNAL_ERROR",
							status: 500,
							message: "Internal server error",
						};
			console.error(
				JSON.stringify({
					message: "privacy erasure request failed",
					requestId,
					method: request.method,
					path: url.pathname,
					status: failure.status,
					code: failure.code,
				}),
			);
			return errorResponse(failure.code, failure.status, failure.message);
		}
	},
} satisfies ExportedHandler<PrivacyErasureEnv>;
