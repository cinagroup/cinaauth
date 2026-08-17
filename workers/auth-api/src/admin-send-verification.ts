import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { SECURITY_FRESH_AGE_SECONDS } from "./auth";

const VERIFICATION_TYPES = ["email-otp", "phone-number"] as const;
type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const ADMIN_VERIFICATION_RATE_LIMIT_RULE = {
	window: 5 * 60,
	max: 3,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

type AdminVerificationUser = {
	id?: unknown;
	email?: unknown;
	phoneNumber?: unknown;
};

/** Server API methods guaranteed by the configured delivery plugins. */
export type AdminVerificationServerApi = {
	sendVerificationOTP: (input: {
		body: { email: string; type: "email-verification" };
		headers: Headers;
	}) => Promise<unknown>;
	sendPhoneNumberOTP: (input: {
		body: { phoneNumber: string };
		headers: Headers;
	}) => Promise<unknown>;
	logAudit: (input: {
		body: {
			category: string;
			action: string;
			result: "success" | "failure";
			actorSite?: string;
			targetType?: string;
			targetId?: string;
			metadata?: Record<string, unknown>;
		};
		headers: Headers;
	}) => Promise<unknown>;
};

const isAdminVerificationServerApi = (
	value: object,
): value is AdminVerificationServerApi =>
	"sendVerificationOTP" in value &&
	typeof value.sendVerificationOTP === "function" &&
	"sendPhoneNumberOTP" in value &&
	typeof value.sendPhoneNumberOTP === "function" &&
	"logAudit" in value &&
	typeof value.logAudit === "function";

/** Fail closed if plugin type erasure ever hides a real runtime omission. */
export const getAdminVerificationServerApi = (
	value: object,
): AdminVerificationServerApi | null =>
	isAdminVerificationServerApi(value) ? value : null;

export type AdminVerificationAuditEvent = {
	actorId: string;
	targetId: string;
	channel: VerificationType;
};

export type AdminVerificationLogEvent = {
	level: "info" | "warn" | "error";
	message:
		| "cinaauth.admin_verification.sent"
		| "cinaauth.admin_verification.rejected"
		| "cinaauth.admin_verification.failed";
	code?: string;
	actorId?: string;
	targetId?: string;
	channel?: VerificationType;
	retryAfter?: number | null;
	error?: string;
};

type AdminVerificationRateLimitResult = {
	allowed: boolean;
	retryAfter: number | null;
};

/** Stable, injection-safe bucket for an actor, target, and delivery channel. */
export const getAdminVerificationRateLimitKey = (
	actorId: string,
	targetId: string,
	channel: VerificationType,
) =>
	`admin-send-verification|${encodeURIComponent(actorId)}|${encodeURIComponent(targetId)}|${channel}`;

/** Narrow server-side capabilities needed by the Admin verification endpoint. */
export type AdminVerificationDependencies = {
	serverApiAvailable: boolean;
	getSession: () => Promise<{
		user: { id: string; role?: string | null };
		session: { createdAt: Date | string };
	} | null>;
	findUserById: (userId: string) => Promise<AdminVerificationUser | null>;
	sendEmailOtp: (input: {
		email: string;
		type: "email-verification";
	}) => Promise<unknown>;
	sendPhoneOtp: (input: { phoneNumber: string }) => Promise<unknown>;
	consumeRateLimit:
		| ((
				key: string,
				rule: { window: number; max: number },
		  ) => Promise<AdminVerificationRateLimitResult>)
		| undefined;
	writeAuditEvent: (event: AdminVerificationAuditEvent) => Promise<unknown>;
	logEvent: (event: AdminVerificationLogEvent) => void;
};

type AdminVerificationStatus = 200 | 400 | 401 | 403 | 404 | 429 | 502 | 503;

type AdminVerificationResult = {
	status: AdminVerificationStatus;
	retryAfter?: number | null;
	body:
		| { ok: true; data: { sent: true } }
		| {
				ok: false;
				error: {
					code: string;
					message: string;
					status: Exclude<AdminVerificationStatus, 200>;
				};
		  };
};

export type AdminVerificationBodyResult =
	| { ok: true; body: unknown }
	| { ok: false };

const failure = (
	status: Exclude<AdminVerificationStatus, 200>,
	code: string,
	message: string,
): AdminVerificationResult => ({
	status,
	body: { ok: false, error: { code, message, status } },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isVerificationType = (value: unknown): value is VerificationType =>
	VERIFICATION_TYPES.some((candidate) => candidate === value);

const isValidUserId = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length > 0 &&
	value.length <= 256 &&
	value === value.trim() &&
	!CONTROL_CHARACTER_PATTERN.test(value);

const normalizeEmail = (value: unknown): string | null => {
	if (typeof value !== "string") return null;
	const email = value.trim();
	return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
};

const normalizePhoneNumber = (value: unknown): string | null => {
	if (typeof value !== "string") return null;
	const phoneNumber = value.trim();
	return PHONE_PATTERN.test(phoneNumber) ? phoneNumber : null;
};

const isFreshAdminVerificationSession = (
	createdAt: Date | string,
	now = Date.now(),
) => {
	const createdAtMs = new Date(createdAt).getTime();
	const age = now - createdAtMs;
	return (
		Number.isFinite(createdAtMs) &&
		age >= 0 &&
		age < SECURITY_FRESH_AGE_SECONDS * 1000
	);
};

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

/**
 * Authorizes and dispatches an Admin-triggered verification challenge through
 * trusted server APIs. Public CAPTCHA-protected handlers are never invoked.
 */
export const handleAdminSendVerification = async (
	dependencies: AdminVerificationDependencies,
	readBody: () => Promise<AdminVerificationBodyResult>,
): Promise<AdminVerificationResult> => {
	const session = await dependencies.getSession();
	if (!session) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_verification.rejected",
			code: "UNAUTHORIZED",
		});
		return failure(401, "UNAUTHORIZED", "Authentication required");
	}
	if (
		!hasAdminControlPermission(
			session.user.role,
			"identity.user.send-verification",
		)
	) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_verification.rejected",
			code: "FORBIDDEN",
			actorId: session.user.id,
		});
		return failure(403, "FORBIDDEN", "Permission denied");
	}
	if (!isFreshAdminVerificationSession(session.session.createdAt)) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_verification.rejected",
			code: "SESSION_NOT_FRESH",
			actorId: session.user.id,
		});
		return failure(403, "SESSION_NOT_FRESH", "Recent authentication required");
	}
	if (!dependencies.serverApiAvailable) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_verification.failed",
			code: "VERIFICATION_DELIVERY_UNAVAILABLE",
			actorId: session.user.id,
		});
		return failure(
			503,
			"VERIFICATION_DELIVERY_UNAVAILABLE",
			"Verification delivery is unavailable",
		);
	}
	const bodyResult = await readBody();
	if (!bodyResult.ok) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_verification.rejected",
			code: "INVALID_JSON",
			actorId: session.user.id,
		});
		return failure(400, "INVALID_JSON", "Request body must be valid JSON");
	}
	const body = bodyResult.body;

	if (
		!isRecord(body) ||
		!isValidUserId(body.userId) ||
		!isVerificationType(body.type)
	) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_verification.rejected",
			code: "INVALID_VERIFICATION_REQUEST",
			actorId: session.user.id,
		});
		return failure(
			400,
			"INVALID_VERIFICATION_REQUEST",
			"A valid userId and verification type are required",
		);
	}

	const { userId, type } = body;
	if (!dependencies.consumeRateLimit) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_verification.failed",
			code: "RATE_LIMIT_UNAVAILABLE",
			actorId: session.user.id,
			targetId: userId,
			channel: type,
		});
		return failure(
			503,
			"RATE_LIMIT_UNAVAILABLE",
			"Verification rate limiting is unavailable",
		);
	}

	let rateLimit: AdminVerificationRateLimitResult;
	try {
		rateLimit = await dependencies.consumeRateLimit(
			getAdminVerificationRateLimitKey(session.user.id, userId, type),
			ADMIN_VERIFICATION_RATE_LIMIT_RULE,
		);
	} catch (error) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_verification.failed",
			code: "RATE_LIMIT_UNAVAILABLE",
			actorId: session.user.id,
			targetId: userId,
			channel: type,
			error: errorMessage(error),
		});
		return failure(
			503,
			"RATE_LIMIT_UNAVAILABLE",
			"Verification rate limiting is unavailable",
		);
	}
	if (!rateLimit.allowed) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_verification.rejected",
			code: "RATE_LIMITED",
			actorId: session.user.id,
			targetId: userId,
			channel: type,
			retryAfter: rateLimit.retryAfter,
		});
		return {
			...failure(429, "RATE_LIMITED", "Too many verification requests"),
			retryAfter: rateLimit.retryAfter,
		};
	}

	let user: AdminVerificationUser | null;
	try {
		user = await dependencies.findUserById(userId);
	} catch (error) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_verification.failed",
			code: "USER_LOOKUP_FAILED",
			actorId: session.user.id,
			targetId: userId,
			channel: type,
			error: errorMessage(error),
		});
		return failure(502, "USER_LOOKUP_FAILED", "Target user lookup failed");
	}
	if (!user) {
		dependencies.logEvent({
			level: "warn",
			message: "cinaauth.admin_verification.rejected",
			code: "USER_NOT_FOUND",
			actorId: session.user.id,
			targetId: userId,
			channel: type,
		});
		return failure(404, "USER_NOT_FOUND", "Target user not found");
	}
	if (user.id !== userId) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_verification.failed",
			code: "USER_ID_MISMATCH",
			actorId: session.user.id,
			targetId: userId,
			channel: type,
		});
		return failure(
			502,
			"USER_ID_MISMATCH",
			"The identity store returned a different user",
		);
	}

	try {
		if (type === "phone-number") {
			const phoneNumber = normalizePhoneNumber(user.phoneNumber);
			if (!phoneNumber) {
				dependencies.logEvent({
					level: "warn",
					message: "cinaauth.admin_verification.rejected",
					code: "INVALID_PHONE",
					actorId: session.user.id,
					targetId: userId,
					channel: type,
				});
				return failure(
					400,
					"INVALID_PHONE",
					"The target user does not have a valid E.164 phone number",
				);
			}
			await dependencies.sendPhoneOtp({ phoneNumber });
		} else {
			const email = normalizeEmail(user.email);
			if (!email) {
				dependencies.logEvent({
					level: "warn",
					message: "cinaauth.admin_verification.rejected",
					code: "INVALID_EMAIL",
					actorId: session.user.id,
					targetId: userId,
					channel: type,
				});
				return failure(
					400,
					"INVALID_EMAIL",
					"The target user does not have a valid email address",
				);
			}
			await dependencies.sendEmailOtp({
				email,
				type: "email-verification",
			});
		}
	} catch (error) {
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_verification.failed",
			code: "VERIFICATION_DELIVERY_FAILED",
			actorId: session.user.id,
			targetId: userId,
			channel: type,
			error: errorMessage(error),
		});
		return failure(
			502,
			"VERIFICATION_DELIVERY_FAILED",
			"Verification delivery failed",
		);
	}

	const auditEvent = {
		actorId: session.user.id,
		targetId: userId,
		channel: type,
	} satisfies AdminVerificationAuditEvent;
	try {
		await dependencies.writeAuditEvent(auditEvent);
	} catch (error) {
		// Delivery has already succeeded. Returning an error would invite a
		// duplicate challenge, so preserve success and emit a structured alert.
		dependencies.logEvent({
			level: "error",
			message: "cinaauth.admin_verification.failed",
			code: "AUDIT_WRITE_FAILED",
			...auditEvent,
			error: errorMessage(error),
		});
	}
	dependencies.logEvent({
		level: "info",
		message: "cinaauth.admin_verification.sent",
		...auditEvent,
	});

	return { status: 200, body: { ok: true, data: { sent: true } } };
};
