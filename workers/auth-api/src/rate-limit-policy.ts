import type { RateLimit } from "cinaauth";

export type RateLimitRule = {
	window: number;
	max: number;
};

export type RateLimitDecision =
	| {
			action: "reset" | "increment";
			allowed: true;
			retryAfter: null;
	  }
	| {
			action: "block";
			allowed: false;
			retryAfter: number;
	  };

const assertRule = (rule: RateLimitRule) => {
	if (
		!Number.isFinite(rule.window) ||
		!Number.isInteger(rule.window) ||
		rule.window <= 0 ||
		!Number.isFinite(rule.max) ||
		!Number.isInteger(rule.max) ||
		rule.max <= 0
	) {
		throw new RangeError("Rate-limit window and max must be positive integers");
	}
};

/**
 * Decides one serialized rate-limit operation for a Durable Object shard.
 */
export const decideRateLimit = (
	current: RateLimit | null | undefined,
	rule: RateLimitRule,
	now: number,
): RateLimitDecision => {
	assertRule(rule);
	const windowMs = rule.window * 1000;
	if (!current || now - current.lastRequest > windowMs) {
		return { action: "reset", allowed: true, retryAfter: null };
	}
	if (current.count >= rule.max) {
		return {
			action: "block",
			allowed: false,
			retryAfter: Math.max(
				1,
				Math.ceil((current.lastRequest + windowMs - now) / 1000),
			),
		};
	}
	return { action: "increment", allowed: true, retryAfter: null };
};
