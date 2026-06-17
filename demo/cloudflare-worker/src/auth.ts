import { CinaAuth } from "cinaauth";
import { drizzleAdapter } from "cinaauth/adapters/drizzle";
import { jwt } from "cinaauth/plugins/jwt";
import { createDrizzle } from "./db";
import type { CloudflareBindings } from "./env";

/**
 * Creates a CinaAuth instance per-request with the current D1 binding.
 * Cloudflare Workers are stateless, so the D1 database binding must be
 * injected from the request environment on every invocation.
 */
export const createAuth = (env: CloudflareBindings) =>
  CinaAuth({
    baseURL: env.CINAAUTH_URL || "https://auth.cinagroup.com",
    secret: env.CINAAUTH_SECRET,
    database: drizzleAdapter(createDrizzle(env.DB), { provider: "sqlite" }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [jwt()],
    trustedOrigins: [
      "https://demo-auth.cinagroup.com",
      "https://*.cinagroup.com",
    ],
    advanced: {
      backgroundTasks: {
        handler: (p) => {
          // Use ExecutionContext.waitUntil for background tasks in Workers
          const ctx = (globalThis as any).__ctx;
          if (ctx?.waitUntil) ctx.waitUntil(p);
        },
      },
    },
  });

export type Auth = ReturnType<typeof createAuth>;
