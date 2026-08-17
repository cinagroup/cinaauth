import { emailOTP } from "cinaauth/plugins/email-otp";
import { getTestInstance } from "cinaauth/test";
import { describe, expect, it, vi } from "vitest";
import type {
	EmailOtpTargetRateLimitEvent,
	EmailOtpTargetRateLimitResult,
} from "../src/email-otp-target-rate-limit";
import { createEmailOtpTargetRateLimitPlugin } from "../src/email-otp-target-rate-limit";
import type { RateLimitRule } from "../src/rate-limit-policy";

// Mirrors the in-module default rules; they are intentionally not exported.
const EMAIL_OTP_TARGET_BURST_RATE_LIMIT = {
	window: 60,
	max: 3,
} as const satisfies RateLimitRule;

const EMAIL_OTP_TARGET_DAILY_RATE_LIMIT = {
	window: 24 * 60 * 60,
	max: 10,
} as const satisfies RateLimitRule;

const SECRET = "email-otp-target-rate-limit-test-secret-0123456789";
const AUTH_BASE_URL = "http://localhost:3000/api/auth";

type TestFetch = (
	url: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

const requestSignInOtp = (
	customFetchImpl: TestFetch,
	email: string,
	source = "203.0.113.10",
) =>
	customFetchImpl(`${AUTH_BASE_URL}/email-otp/send-verification-otp`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"cf-connecting-ip": source,
		},
		body: JSON.stringify({ email, type: "sign-in" }),
	});

const allowRateLimit = async (): Promise<EmailOtpTargetRateLimitResult> => ({
	allowed: true,
	retryAfter: null,
});

const createCountingConsume = () => {
	const counts = new Map<string, number>();
	return vi.fn(async (key: string, rule: RateLimitRule) => {
		const count = counts.get(key) ?? 0;
		if (count >= rule.max) {
			return { allowed: false, retryAfter: rule.window };
		}
		counts.set(key, count + 1);
		return { allowed: true, retryAfter: null };
	});
};

const createInstance = async (options?: {
	secret?: string;
	consumeRateLimit?: (
		key: string,
		rule: RateLimitRule,
	) => Promise<EmailOtpTargetRateLimitResult>;
	burstRule?: RateLimitRule;
	dailyRule?: RateLimitRule;
	logEvent?: (event: EmailOtpTargetRateLimitEvent) => void;
}) => {
	const sendVerificationOTP = vi.fn(async () => undefined);
	const instance = await getTestInstance({
		rateLimit: { enabled: false },
		plugins: [
			createEmailOtpTargetRateLimitPlugin(
				{ CINAAUTH_SECRET: options?.secret ?? SECRET },
				{
					consumeRateLimit: options?.consumeRateLimit ?? allowRateLimit,
					burstRule: options?.burstRule,
					dailyRule: options?.dailyRule,
					logEvent: options?.logEvent,
				},
			),
			emailOTP({ sendVerificationOTP }),
		],
	});
	return { ...instance, sendVerificationOTP };
};

describe("Email OTP target rate-limit plugin", () => {
	it("normalizes case and whitespace into one target bucket across sources", async () => {
		const consumeRateLimit = vi.fn(allowRateLimit);
		const { customFetchImpl, sendVerificationOTP } = await createInstance({
			consumeRateLimit,
		});

		const first = await requestSignInOtp(
			customFetchImpl,
			"  Target.User@Example.COM  ",
			"203.0.113.10",
		);
		const second = await requestSignInOtp(
			customFetchImpl,
			"target.user@example.com",
			"198.51.100.25",
		);

		expect(first.status).toBe(200);
		expect(second.status).toBe(200);
		expect(sendVerificationOTP).toHaveBeenCalledTimes(2);
		expect(consumeRateLimit).toHaveBeenCalledTimes(4);
		expect(consumeRateLimit.mock.calls[0]?.[0]).toBe(
			consumeRateLimit.mock.calls[2]?.[0],
		);
		expect(consumeRateLimit.mock.calls[1]?.[0]).toBe(
			consumeRateLimit.mock.calls[3]?.[0],
		);
		expect(consumeRateLimit.mock.calls.map((call) => call[1])).toEqual([
			EMAIL_OTP_TARGET_BURST_RATE_LIMIT,
			EMAIL_OTP_TARGET_DAILY_RATE_LIMIT,
			EMAIL_OTP_TARGET_BURST_RATE_LIMIT,
			EMAIL_OTP_TARGET_DAILY_RATE_LIMIT,
		]);
		const serializedKeys = JSON.stringify(consumeRateLimit.mock.calls);
		expect(serializedKeys).not.toContain("Target.User@Example.COM");
		expect(serializedKeys).not.toContain("target.user@example.com");
		expect(serializedKeys).not.toContain("203.0.113.10");
		expect(serializedKeys).not.toContain("198.51.100.25");
	});

	it("returns the same anonymous success for known and unknown targets", async () => {
		const { customFetchImpl, sendVerificationOTP, testUser } =
			await createInstance();

		const known = await requestSignInOtp(customFetchImpl, testUser.email);
		const unknown = await requestSignInOtp(
			customFetchImpl,
			"unknown-target@example.com",
		);

		expect(known.status).toBe(200);
		expect(unknown.status).toBe(200);
		expect(await known.json()).toEqual(await unknown.json());
		expect(sendVerificationOTP).toHaveBeenCalledTimes(2);
	});

	it("enforces the burst quota before the email handler", async () => {
		const consumeRateLimit = createCountingConsume();
		const { customFetchImpl, sendVerificationOTP } = await createInstance({
			consumeRateLimit,
		});
		const statuses: number[] = [];

		for (
			let attempt = 0;
			attempt <= EMAIL_OTP_TARGET_BURST_RATE_LIMIT.max;
			attempt++
		) {
			statuses.push(
				(await requestSignInOtp(customFetchImpl, "burst-target@example.com"))
					.status,
			);
		}

		expect(statuses).toEqual([200, 200, 200, 429]);
		expect(sendVerificationOTP).toHaveBeenCalledTimes(
			EMAIL_OTP_TARGET_BURST_RATE_LIMIT.max,
		);
		expect(
			consumeRateLimit.mock.calls.filter(
				([, rule]) => rule.window === EMAIL_OTP_TARGET_BURST_RATE_LIMIT.window,
			),
		).toHaveLength(EMAIL_OTP_TARGET_BURST_RATE_LIMIT.max + 1);
		expect(
			consumeRateLimit.mock.calls.filter(
				([, rule]) => rule.window === EMAIL_OTP_TARGET_DAILY_RATE_LIMIT.window,
			),
		).toHaveLength(EMAIL_OTP_TARGET_BURST_RATE_LIMIT.max);
	});

	it("enforces the 24-hour target quota before the email handler", async () => {
		const consumeRateLimit = createCountingConsume();
		const { customFetchImpl, sendVerificationOTP } = await createInstance({
			consumeRateLimit,
			burstRule: { window: 60, max: 100 },
		});
		const statuses: number[] = [];

		for (
			let attempt = 0;
			attempt <= EMAIL_OTP_TARGET_DAILY_RATE_LIMIT.max;
			attempt++
		) {
			statuses.push(
				(await requestSignInOtp(customFetchImpl, "daily-target@example.com"))
					.status,
			);
		}

		expect(statuses.slice(0, -1)).toEqual(
			Array(EMAIL_OTP_TARGET_DAILY_RATE_LIMIT.max).fill(200),
		);
		expect(statuses.at(-1)).toBe(429);
		expect(sendVerificationOTP).toHaveBeenCalledTimes(
			EMAIL_OTP_TARGET_DAILY_RATE_LIMIT.max,
		);
	});

	it.each([
		{
			name: "missing secret",
			secret: "",
			consumeRateLimit: vi.fn(allowRateLimit),
		},
		{
			name: "limiter failure",
			secret: SECRET,
			consumeRateLimit: vi.fn(async () => {
				throw new Error("RATE_LIMITER unavailable");
			}),
		},
	])("fails closed on $name without leaking the target", async (testCase) => {
		const logEvent = vi.fn<(event: EmailOtpTargetRateLimitEvent) => void>();
		const { customFetchImpl, sendVerificationOTP } = await createInstance({
			secret: testCase.secret,
			consumeRateLimit: testCase.consumeRateLimit,
			logEvent,
		});
		const email = "Private.Target+Secret@Example.COM";

		const response = await requestSignInOtp(customFetchImpl, email);
		const responseText = await response.text();

		expect(response.status).toBe(503);
		expect(sendVerificationOTP).not.toHaveBeenCalled();
		expect(logEvent).toHaveBeenCalledWith({
			level: "error",
			code: "EMAIL_OTP_TARGET_RATE_LIMIT_UNAVAILABLE",
		});
		if (testCase.name === "missing secret") {
			expect(testCase.consumeRateLimit).not.toHaveBeenCalled();
		}
		const artifacts = JSON.stringify({
			consume: testCase.consumeRateLimit.mock.calls,
			logs: logEvent.mock.calls,
			responseText,
		});
		expect(artifacts).not.toContain(email);
		expect(artifacts).not.toContain(email.toLowerCase());
	});

	it("uses the existing RATE_LIMITER atomic consume surface for both quotas", async () => {
		const consume = vi.fn(allowRateLimit);
		const getByName = vi.fn(() => ({
			consume,
			get: vi.fn(async () => null),
			set: vi.fn(async () => undefined),
		}));
		const sendVerificationOTP = vi.fn(async () => undefined);
		const { customFetchImpl } = await getTestInstance({
			rateLimit: { enabled: false },
			plugins: [
				createEmailOtpTargetRateLimitPlugin({
					CINAAUTH_SECRET: SECRET,
					RATE_LIMITER: { getByName },
				}),
				emailOTP({ sendVerificationOTP }),
			],
		});

		const response = await requestSignInOtp(
			customFetchImpl,
			"durable-target@example.com",
		);

		expect(response.status).toBe(200);
		expect(getByName).toHaveBeenCalledTimes(2);
		expect(consume).toHaveBeenCalledTimes(2);
		expect(sendVerificationOTP).toHaveBeenCalledTimes(1);
		const artifacts = JSON.stringify({
			getByName: getByName.mock.calls,
			consume: consume.mock.calls,
		});
		expect(artifacts).not.toContain("durable-target@example.com");
	});
});
