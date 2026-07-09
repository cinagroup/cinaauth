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
		const { getMigrations } = await import("cinaauth/db/migration");
		const { admin } = await import("cinaauth/plugins/admin");
		const { auditLog } = await import("cinaauth/plugins/audit-log");
		const { jwt } = await import("cinaauth/plugins/jwt");
		// Reuse the access-control config from auth.ts so migrations and the auth
		// instance always agree on which tables/columns to create.
		const { ac, roles } = await import("./auth");

		// getMigrations needs the plugin config (to know which tables to create)
		// and a Kysely-compatible database. The D1 binding is auto-detected by
		// createKyselyAdapter, so we pass it directly as `database` with the same
		// plugins the auth instance uses.
		const { runMigrations, toBeCreated, toBeAdded } = await getMigrations({
			database: c.env.DB,
			plugins: [
				jwt(),
				admin({
					defaultRole: "user",
					adminRoles: ["super_admin", "security_admin"],
					ac,
					roles,
				}),
				auditLog({
					writeTokens: c.env.CINAUTH_ADMIN_SERVICE_KEY
						? [c.env.CINAUTH_ADMIN_SERVICE_KEY]
						: [],
				}),
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
