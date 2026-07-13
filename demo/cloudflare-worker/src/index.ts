import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Auth } from "./auth";
import { createAuth } from "./auth";
import type { CloudflareBindings } from "./env";

const app = new Hono<{
	Bindings: CloudflareBindings;
	Variables: {
		auth: Auth;
	};
}>();

// Middleware
app.use(
	"*",
	cors({
		origin: ["https://demo-auth.cinagroup.com", "https://*.cinagroup.com"],
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		credentials: true,
	}),
);

// Create auth instance per-request with current env bindings
app.use("*", async (c, next) => {
	const auth = createAuth(c.env);
	c.set("auth", auth);
	// Store execution context for background tasks
	(globalThis as any).__ctx = c.executionCtx;
	await next();
});

// Rate-limit configuration endpoint (read-only, for the admin console's
// security-policy page). Must be registered BEFORE the /api/auth/* catch-all
// so Hono routes it here instead of delegating to the auth handler.
app.get("/api/auth/admin/rate-limit-config", async (c) => {
	const session = await c.var.auth.api.getSession({
		headers: c.req.raw.headers,
	});
	if (!session || session.user.role !== "super_admin") {
		return c.json({ error: "Forbidden" }, 403);
	}
	const rl = c.var.auth.options.rateLimit;
	return c.json({
		enabled: rl?.enabled ?? true,
		window: rl?.window ?? 10,
		max: rl?.max ?? 100,
		storage: rl?.storage ?? "memory",
		customRules: rl?.customRules ?? {},
	});
});

// Auth catch-all route handler
app.on(["POST", "GET"], "/api/auth/*", (c) => c.var.auth.handler(c.req.raw));

// Health check
app.get("/", (c) =>
	c.json({
		name: "CinaAuth API",
		status: "running",
		version: "1.0.0",
	}),
);

// Session check endpoint (for debugging)
app.get("/api/session", async (c) => {
	const session = await c.var.auth.api.getSession({
		headers: c.req.raw.headers,
	});
	if (session) {
		return c.json({ user: session.user, session: session.session });
	}
	return c.json({ error: "Not authenticated" }, 401);
});

// Database migration endpoint (run once after deployment)
	app.post("/api/migrate", async (c) => {
		try {
			const { apiKey } = await import("@cinaauth/api-key");
			const { getMigrations } = await import("cinaauth/db/migration");
			const { admin } = await import("cinaauth/plugins/admin");
			const { anonymous } = await import("cinaauth/plugins/anonymous");
			const { auditLog } = await import("cinaauth/plugins/audit-log");
			const { customSession } = await import("cinaauth/plugins/custom-session");
			const { emailOTP } = await import("cinaauth/plugins/email-otp");
			const { genericOAuth } = await import("cinaauth/plugins/generic-oauth");
			const { haveIBeenPwned } = await import("cinaauth/plugins/haveibeenpwned");
			const { jwt } = await import("cinaauth/plugins/jwt");
			const { lastLoginMethod } = await import("cinaauth/plugins/last-login-method");
			const { magicLink } = await import("cinaauth/plugins/magic-link");
			const { multiSession } = await import("cinaauth/plugins/multi-session");
			const { oneTimeToken } = await import("cinaauth/plugins/one-time-token");
			const { organization } = await import("cinaauth/plugins/organization");
			const { phoneNumber } = await import("cinaauth/plugins/phone-number");
			const { siwe } = await import("cinaauth/plugins/siwe");
			const { twoFactor } = await import("cinaauth/plugins/two-factor");
			const { username } = await import("cinaauth/plugins/username");
			const { ac, roles } = await import("./auth");

			const { runMigrations, toBeCreated, toBeAdded } = await getMigrations({
				database: c.env.DB,
				plugins: [
					jwt(),
					twoFactor(),
					organization(),
					apiKey({ references: "user" }),
					admin({
						defaultRole: "user",
						adminRoles: ["super_admin", "security_admin"],
						ac,
						roles,
					}),
					auditLog({
						allowedRoles: ["super_admin", "security_admin"],
						writeTokens: c.env.CINAUTH_ADMIN_SERVICE_KEY
							? [c.env.CINAUTH_ADMIN_SERVICE_KEY]
							: [],
					}),
					siwe(),
					username(),
					emailOTP({
						sendVerificationOTP: async ({ email, otp }) => {
							console.log(`[email-otp] OTP for ${email}: ${otp}`);
						},
					}),
					magicLink({
						sendMagicLink: async ({ email, url }) => {
							console.log(`[magic-link] ${email}: ${url}`);
						},
					}),
					phoneNumber({
						sendOTP: async ({ phoneNumber, code }) => {
							console.log(`[phone-number] OTP for ${phoneNumber}: ${code}`);
						},
					}),
					anonymous(),
					oneTimeToken(),
					haveIBeenPwned(),
					multiSession({ maximumSessions: 10 }),
					customSession(async ({ user, session }) => ({ user, session })),
					lastLoginMethod(),
					genericOAuth({ providers: [] }),
				],
			});
		await runMigrations();
		return c.json({
			success: true,
			message: "Migrations applied successfully",
			created: toBeCreated.map((t) => t.table),
			added: toBeAdded.map((t) => t.table),
		});
	} catch (err) {
		console.error("Migration error:", err);
		return c.json(
			{
				success: false,
				error: err instanceof Error ? err.message : String(err),
				stack:
					err instanceof Error ? err.stack?.split("\n").slice(0, 8) : undefined,
			},
			500,
		);
	}
});

export default app satisfies ExportedHandler<CloudflareBindings>;
