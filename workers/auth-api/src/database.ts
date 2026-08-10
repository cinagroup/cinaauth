import { Pool } from "pg";
import type { CloudflareBindings } from "./env";

export const isHyperdrive = (value: unknown): value is Hyperdrive =>
	typeof (value as Hyperdrive | undefined)?.connectionString === "string";

/**
 * Creates a request-scoped PostgreSQL pool backed by Cloudflare Hyperdrive.
 * Hyperdrive owns the upstream connection pool; the short idle timeout keeps
 * Worker-side clients from surviving after their request has gone idle.
 */
export const createDatabase = (env: CloudflareBindings) => {
	if (!isHyperdrive(env.HYPERDRIVE)) {
		throw new Error("HYPERDRIVE binding is unavailable");
	}
	return new Pool({
		connectionString: env.HYPERDRIVE.connectionString,
		max: 5,
		connectionTimeoutMillis: 10_000,
		idleTimeoutMillis: 5_000,
		allowExitOnIdle: true,
	});
};

export type CinaAuthDatabase = ReturnType<typeof createDatabase>;
