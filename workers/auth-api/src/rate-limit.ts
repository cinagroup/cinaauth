import { DurableObject } from "cloudflare:workers";
import type { RateLimit } from "cinaauth";
import type { CloudflareBindings } from "./env";
import type { RateLimitRule } from "./rate-limit-policy";
import { decideRateLimit } from "./rate-limit-policy";

type RateLimitRow = {
	key: string;
	count: number;
	lastRequest: number;
	expiresAt: number;
};

const LEGACY_ENTRY_TTL_MS = 60 * 60 * 1000;
const PRUNE_INTERVAL = 128;

/**
 * A SQLite-backed, sharded Durable Object that atomically consumes CinaAuth
 * rate-limit buckets. Cloudflare serializes RPC calls within each shard.
 */
export class RateLimitDurableObject extends DurableObject<CloudflareBindings> {
	private operations = 0;

	constructor(ctx: DurableObjectState, env: CloudflareBindings) {
		super(ctx, env);
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS rate_limit_buckets (
				key TEXT PRIMARY KEY,
				count INTEGER NOT NULL,
				last_request INTEGER NOT NULL,
				expires_at INTEGER NOT NULL
			);
			CREATE INDEX IF NOT EXISTS rate_limit_buckets_expires_at
				ON rate_limit_buckets (expires_at);
		`);
	}

	private read(key: string): RateLimitRow | undefined {
		return this.ctx.storage.sql
			.exec<RateLimitRow>(
				`SELECT key, count, last_request AS lastRequest,
					expires_at AS expiresAt
				 FROM rate_limit_buckets
				 WHERE key = ?`,
				key,
			)
			.toArray()[0];
	}

	private prune(now: number) {
		this.operations = (this.operations + 1) % PRUNE_INTERVAL;
		if (this.operations === 0) {
			this.ctx.storage.sql.exec(
				"DELETE FROM rate_limit_buckets WHERE expires_at <= ?",
				now,
			);
		}
	}

	async consume(
		key: string,
		rule: RateLimitRule,
	): Promise<{ allowed: boolean; retryAfter: number | null }> {
		const now = Date.now();
		const current = this.read(key);
		const decision = decideRateLimit(current, rule, now);

		if (decision.action === "reset") {
			this.ctx.storage.sql.exec(
				`INSERT INTO rate_limit_buckets
					(key, count, last_request, expires_at)
				 VALUES (?, 1, ?, ?)
				 ON CONFLICT(key) DO UPDATE SET
					count = 1,
					last_request = excluded.last_request,
					expires_at = excluded.expires_at`,
				key,
				now,
				now + rule.window * 1000,
			);
		} else if (decision.action === "increment") {
			this.ctx.storage.sql.exec(
				`UPDATE rate_limit_buckets
				 SET count = count + 1,
					last_request = ?,
					expires_at = ?
				 WHERE key = ?`,
				now,
				now + rule.window * 1000,
				key,
			);
		}

		this.prune(now);
		return {
			allowed: decision.allowed,
			retryAfter: decision.retryAfter,
		};
	}

	async get(key: string): Promise<RateLimit | null> {
		const current = this.read(key);
		if (!current) return null;
		if (current.expiresAt <= Date.now()) {
			this.ctx.storage.sql.exec(
				"DELETE FROM rate_limit_buckets WHERE key = ?",
				key,
			);
			return null;
		}
		return {
			key: current.key,
			count: current.count,
			lastRequest: current.lastRequest,
		};
	}

	async set(key: string, value: RateLimit): Promise<void> {
		this.ctx.storage.sql.exec(
			`INSERT INTO rate_limit_buckets
				(key, count, last_request, expires_at)
			 VALUES (?, ?, ?, ?)
			 ON CONFLICT(key) DO UPDATE SET
				count = excluded.count,
				last_request = excluded.last_request,
				expires_at = excluded.expires_at`,
			key,
			value.count,
			value.lastRequest,
			value.lastRequest + LEGACY_ENTRY_TTL_MS,
		);
	}
}
