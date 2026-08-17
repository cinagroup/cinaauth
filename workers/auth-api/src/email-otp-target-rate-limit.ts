import type { CinaAuthPlugin } from "cinaauth";
import { createAuthMiddleware } from "cinaauth/api";
import type { RateLimitRule } from "./rate-limit-policy";
import { createDurableObjectRateLimitStorage } from "./rate-limit-storage";

const EMAIL_OTP_TARGET_PATH = "/email-otp/send-verification-otp";
const EMAIL_OTP_TARGET_KEY_PREFIX = "email-otp-target:v1";
const MINIMUM_SECRET_LENGTH = 32;

const EMAIL_OTP_TARGET_BURST_RATE_LIMIT = {
	window: 60,
	max: 3,
} as const satisfies RateLimitRule;

const EMAIL_OTP_TARGET_DAILY_RATE_LIMIT = {
	window: 24 * 60 * 60,
	max: 10,
} as const satisfies RateLimitRule;

export type EmailOtpTargetRateLimitResult = {
	allowed: boolean;
	retryAfter: number | null;
};

export type EmailOtpTargetRateLimitEvent = {
	level: "warn" | "error";
	code:
		| "EMAIL_OTP_TARGET_RATE_LIMITED"
		| "EMAIL_OTP_TARGET_RATE_LIMIT_UNAVAILABLE";
	quota?: "burst" | "daily" | undefined;
	retryAfter?: number | null | undefined;
};

type ConsumeRateLimit = (
	key: string,
	rule: RateLimitRule,
) => Promise<EmailOtpTargetRateLimitResult>;

type RateLimitNamespace = Parameters<
	typeof createDurableObjectRateLimitStorage
>[0]["RATE_LIMITER"];

export type EmailOtpTargetRateLimitEnv = {
	CINAAUTH_SECRET?: string | undefined;
	RATE_LIMITER?: RateLimitNamespace | undefined;
};

export type EmailOtpTargetRateLimitOptions = {
	/** Test or alternate-runtime injection. Production should use RATE_LIMITER. */
	consumeRateLimit?: ConsumeRateLimit | undefined;
	burstRule?: RateLimitRule | undefined;
	dailyRule?: RateLimitRule | undefined;
	logEvent?: ((event: EmailOtpTargetRateLimitEvent) => void) | undefined;
};

const normalizeTarget = (email: string) => email.trim().toLowerCase();

const hmacTarget = async (secret: string, normalizedEmail: string) => {
	if (secret.trim().length < MINIMUM_SECRET_LENGTH) {
		throw new Error("CINAAUTH_SECRET is unavailable");
	}
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = new Uint8Array(
		await crypto.subtle.sign(
			"HMAC",
			key,
			encoder.encode(`cinaauth:email-otp-target:v1\0${normalizedEmail}`),
		),
	);
	return Array.from(signature, (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
};

const isRateLimitResult = (
	value: EmailOtpTargetRateLimitResult,
): value is EmailOtpTargetRateLimitResult =>
	typeof value.allowed === "boolean" &&
	(value.retryAfter === null ||
		(typeof value.retryAfter === "number" &&
			Number.isFinite(value.retryAfter) &&
			value.retryAfter >= 0));

/**
 * Adds per-recipient abuse limits in front of the Email OTP send handler.
 * Recipient identifiers are HMAC-derived and never placed in keys or events.
 */
export const createEmailOtpTargetRateLimitPlugin = (
	env: EmailOtpTargetRateLimitEnv,
	options: EmailOtpTargetRateLimitOptions = {},
): CinaAuthPlugin => {
	const durableConsume = env.RATE_LIMITER
		? createDurableObjectRateLimitStorage({
				RATE_LIMITER: env.RATE_LIMITER,
			}).consume
		: undefined;
	const consumeRateLimit = options.consumeRateLimit ?? durableConsume;
	const burstRule = options.burstRule ?? EMAIL_OTP_TARGET_BURST_RATE_LIMIT;
	const dailyRule = options.dailyRule ?? EMAIL_OTP_TARGET_DAILY_RATE_LIMIT;

	return {
		id: "email-otp-target-rate-limit",
		hooks: {
			before: [
				{
					priority: 200,
					matcher: (ctx) => ctx.path === EMAIL_OTP_TARGET_PATH,
					handler: createAuthMiddleware(async (ctx) => {
						const rawEmail =
							typeof ctx.body?.email === "string" ? ctx.body.email : "";
						const normalizedEmail = normalizeTarget(rawEmail);
						if (!normalizedEmail) {
							throw ctx.error("BAD_REQUEST", {
								code: "INVALID_EMAIL",
								message: "A valid email is required",
							});
						}

						let targetDigest: string;
						try {
							if (!consumeRateLimit) {
								throw new Error("RATE_LIMITER is unavailable");
							}
							targetDigest = await hmacTarget(
								env.CINAAUTH_SECRET ?? "",
								normalizedEmail,
							);
						} catch {
							options.logEvent?.({
								level: "error",
								code: "EMAIL_OTP_TARGET_RATE_LIMIT_UNAVAILABLE",
							});
							ctx.setHeader("Cache-Control", "no-store");
							throw ctx.error("SERVICE_UNAVAILABLE", {
								code: "EMAIL_OTP_TARGET_RATE_LIMIT_UNAVAILABLE",
								message: "Verification rate limiting is unavailable",
							});
						}

						const consumeQuota = async (
							quota: "burst" | "daily",
							rule: RateLimitRule,
						) => {
							try {
								const result = await consumeRateLimit(
									`${EMAIL_OTP_TARGET_KEY_PREFIX}:${quota}:${targetDigest}`,
									rule,
								);
								if (!isRateLimitResult(result)) {
									throw new Error("Invalid RATE_LIMITER response");
								}
								return result;
							} catch {
								options.logEvent?.({
									level: "error",
									code: "EMAIL_OTP_TARGET_RATE_LIMIT_UNAVAILABLE",
								});
								ctx.setHeader("Cache-Control", "no-store");
								throw ctx.error("SERVICE_UNAVAILABLE", {
									code: "EMAIL_OTP_TARGET_RATE_LIMIT_UNAVAILABLE",
									message: "Verification rate limiting is unavailable",
								});
							}
						};

						const enforceQuota = async (
							quota: "burst" | "daily",
							rule: RateLimitRule,
						) => {
							const result = await consumeQuota(quota, rule);
							if (result.allowed) return;
							options.logEvent?.({
								level: "warn",
								code: "EMAIL_OTP_TARGET_RATE_LIMITED",
								quota,
								retryAfter: result.retryAfter,
							});
							ctx.setHeader("Cache-Control", "no-store");
							if (result.retryAfter !== null) {
								ctx.setHeader(
									"Retry-After",
									String(Math.max(1, Math.ceil(result.retryAfter))),
								);
							}
							throw ctx.error("TOO_MANY_REQUESTS", {
								code: "EMAIL_OTP_TARGET_RATE_LIMITED",
								message: "Too many verification requests",
							});
						};

						// A burst rejection must not consume a legitimate daily candidate.
						await enforceQuota("burst", burstRule);
						await enforceQuota("daily", dailyRule);
						return {
							context: {
								body: { ...ctx.body, email: normalizedEmail },
							},
						};
					}),
				},
			],
		},
	};
};
