import type { CinaAuthDatabase } from "./database";

const CAPACITY_LOCK_TIMEOUT_MS = 10_000;

export const getEntitlementCapacityLockKey = ({
	subjectType,
	subjectId,
	limit,
	usageReferenceId = subjectId,
}: {
	subjectType: "organization" | "user";
	subjectId: string;
	limit: string;
	usageReferenceId?: string;
}) =>
	[
		"entitlement-capacity",
		subjectType,
		subjectId,
		limit,
		usageReferenceId,
	].join(":");

/**
 * Serializes finite-capacity mutations across Worker isolates and PostgreSQL
 * connections. The dedicated transaction holds a global advisory lock while
 * the auth plugin performs its own reads and writes through separate pooled
 * connections.
 */
export const withEntitlementCapacityLock = async <T>(
	database: CinaAuthDatabase,
	key: string,
	operation: () => Promise<T>,
): Promise<T> => {
	const client = await database.connect();
	let transactionStarted = false;
	try {
		await client.query("BEGIN");
		transactionStarted = true;
		await client.query(
			`SET LOCAL statement_timeout = '${CAPACITY_LOCK_TIMEOUT_MS}ms'`,
		);
		await client.query(
			"SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
			[key],
		);
		const result = await operation();
		await client.query("COMMIT");
		transactionStarted = false;
		return result;
	} catch (error) {
		if (transactionStarted) {
			await client.query("ROLLBACK").catch(() => undefined);
		}
		throw error;
	} finally {
		client.release();
	}
};
