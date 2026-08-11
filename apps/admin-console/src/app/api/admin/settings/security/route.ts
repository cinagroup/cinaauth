import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";

type RateLimitRule = {
	path: string;
	window: number;
	max: number;
};

type RateLimitPolicy = {
	enabled: boolean;
	window: number;
	max: number;
	storage: string;
	customRules: RateLimitRule[];
};

const jsonNoStore = (body: unknown, status = 200) =>
	NextResponse.json(body, {
		status,
		headers: { "cache-control": "no-store" },
	});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveInteger = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value) && value > 0;

const normalizeRateLimitPolicy = (value: unknown): RateLimitPolicy | null => {
	if (
		!isRecord(value) ||
		typeof value.enabled !== "boolean" ||
		!isPositiveInteger(value.window) ||
		!isPositiveInteger(value.max) ||
		typeof value.storage !== "string" ||
		value.storage.trim().length === 0 ||
		!isRecord(value.customRules)
	) {
		return null;
	}

	const customRules: RateLimitRule[] = [];
	for (const [path, rule] of Object.entries(value.customRules)) {
		if (
			path.trim().length === 0 ||
			!isRecord(rule) ||
			!isPositiveInteger(rule.window) ||
			!isPositiveInteger(rule.max)
		) {
			return null;
		}
		customRules.push({ path, window: rule.window, max: rule.max });
	}
	customRules.sort((left, right) => left.path.localeCompare(right.path));

	return {
		enabled: value.enabled,
		window: value.window,
		max: value.max,
		storage: value.storage.trim(),
		customRules,
	};
};

/**
 * GET /api/admin/settings/security — read the authoritative Auth Worker
 * rate-limit policy. Settings without an authoritative management endpoint
 * remain explicitly unavailable instead of being inferred or hard-coded.
 */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (
		!session ||
		!hasAdminControlPermission(session.role, "security.policy.read")
	) {
		return jsonNoStore({ ok: false }, 403);
	}

	const cookie = request.headers.get("cookie") ?? "";
	const upstream = await cinaauthFetch<unknown>("/admin/rate-limit-config", {
		cookie,
	});
	if (!upstream.ok) {
		return jsonNoStore(upstream, 502);
	}

	const rateLimit = normalizeRateLimitPolicy(upstream.data);
	if (!rateLimit) {
		return jsonNoStore(
			{
				ok: false,
				error: {
					code: "CINAUTH_INVALID_RATE_LIMIT_CONFIG",
					message:
						"CinaSeek Identity returned an invalid rate-limit configuration",
					status: 502,
				},
			},
			502,
		);
	}

	return jsonNoStore({
		ok: true,
		data: {
			readOnly: true,
			source: "auth-worker",
			rateLimit,
			otpTtl: null,
			otpDailyMax: null,
			lockoutThreshold: null,
			banDuration: null,
			force2fa: null,
			trustedOrigins: null,
		},
	});
}
