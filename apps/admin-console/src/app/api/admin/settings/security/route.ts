import { type NextRequest, NextResponse } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";

/**
 * GET /api/admin/settings/security — return the current security policy view.
 *
 * Returns compile-time/deploy-time constants as read-only display values.
 * Rate-limit configuration is set in cinaauth's auth.ts and not exposed
 * via an API endpoint (the previous /admin/rate-limit-config call was a
 * dead reference — no such endpoint exists in cinaauth).
 */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role) || session.role !== "super_admin") {
		return NextResponse.json({ ok: false }, { status: 403 });
	}

	return NextResponse.json({
		ok: true,
		data: {
			rateLimit: {
				enabled: true,
				window: 60,
				max: 300,
				storage: "Cloudflare Durable Object",
			},
			otpTtl: "15m",
			otpDailyMax: 10,
			lockoutThreshold: 5,
			banDuration: "permanent",
			force2fa: { cinacoin: false, cinatoken: false },
			trustedOrigins: [
				"https://auth.cinaseek.ai",
				"https://accounts.cinaseek.ai",
				"https://demo-auth.cinagroup.com",
				"https://admin.cinaseek.ai",
			],
		},
	});
}
