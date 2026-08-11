import type { PrivacyErasureEnv } from "./env";
import {
	assessRuntime,
	isProtocolFailure,
	readAuthenticatedOperation,
	verifyBearerToken,
} from "./protocol";
import { getStagedSecretsStoreReadiness } from "./secrets-store-readiness";

export { ErasureCoordinator } from "./coordinator";

const SERVICE_NAME = "CinaAuth Privacy Erasure";
const ERASE_PATH = "/cinaauth/privacy/erase";

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

const runtimeAssessment = (env: PrivacyErasureEnv) =>
	assessRuntime({
		webhookSecret: env.CINAAUTH_ERASURE_WEBHOOK_SECRET,
		storageSecret: env.CINAAUTH_ERASURE_STORAGE_SECRET,
		targetsJson: env.CINAAUTH_ERASURE_TARGETS,
	});

const handleReadiness = async (request: Request, env: PrivacyErasureEnv) => {
	const assessment = runtimeAssessment(env);
	const authorization = request.headers.get("authorization");
	const authorized = authorization
		? await verifyBearerToken(
				authorization,
				env.CINAAUTH_ERASURE_WEBHOOK_SECRET ?? "",
			)
		: false;
	if (authorization && !authorized) {
		return errorResponse("INVALID_READINESS_TOKEN", 401, "Unauthorized");
	}
	const secretsStore = authorized
		? await getStagedSecretsStoreReadiness(env)
		: undefined;
	const ok = assessment.ok && (secretsStore?.ok ?? true);
	return json(
		{
			success: ok,
			service: SERVICE_NAME,
			version: env.VERSION_METADATA.id,
			runtimeConfig: {
				ok: assessment.ok,
				...(authorized
					? {
							issues: assessment.issues,
							targetIds: assessment.targetIds,
						}
					: {}),
			},
			...(secretsStore ? { secretsStore } : {}),
		},
		ok ? 200 : 503,
	);
};

const handleErasure = async (request: Request, env: PrivacyErasureEnv) => {
	const assessment = runtimeAssessment(env);
	if (!assessment.ok) {
		return errorResponse(
			"ERASURE_RUNTIME_NOT_READY",
			503,
			"Privacy erasure runtime is not ready",
		);
	}
	const operation = await readAuthenticatedOperation(
		request,
		env.CINAAUTH_ERASURE_WEBHOOK_SECRET,
	);
	const coordinator = env.ERASURE_COORDINATOR.getByName(operation.operationId);
	const result = await coordinator.processOperation(operation);
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
			if (url.pathname === "/" && request.method === "GET") {
				response = json({
					success: true,
					service: SERVICE_NAME,
					version: env.VERSION_METADATA.id,
				});
			} else if (url.pathname === "/ready" && request.method === "GET") {
				response = await handleReadiness(request, env);
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
			const failure = isProtocolFailure(error)
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
