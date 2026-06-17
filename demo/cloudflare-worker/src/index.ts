import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth, type Auth } from "./auth";
import type { CloudflareBindings } from "./env";

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: {
    auth: Auth;
  };
}>();

// Middleware
app.use("*", cors({
  origin: ["https://demo-auth.cinagroup.com", "https://*.cinagroup.com"],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

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
app.get("/", (c) => c.json({
  name: "CinaAuth API",
  status: "running",
  version: "1.0.0",
}));

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
  const { getMigrations } = await import("cinaauth/db/migration");
  const { runMigrations } = await getMigrations({
    database: c.env.DB,
  });
  await runMigrations();
  return c.json({ success: true, message: "Migrations applied successfully" });
});

export default app satisfies ExportedHandler<CloudflareBindings>;
