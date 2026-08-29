import { afterEach, describe, expect, it, vi } from "vitest";
import type { CinaAuthDatabase } from "../src/database";
import type { CloudflareBindings } from "../src/env";
import type { OrganizationIdentityEvent } from "../src/organization-identity-events";
import {
	deliverOrganizationIdentityEvent,
	drainOrganizationIdentityOutbox,
	handleOrganizationIdentityBatch,
	parseOrganizationIdentityOutboxEvent,
	parseOrganizationIdentityOutboxReplayInput,
	replayOrganizationIdentityOutbox,
} from "../src/organization-identity-events";

const encoder = new TextEncoder();

const hmacSha256Hex = async (secret: string, payload: string) => {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(payload),
	);
	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
};

const event: OrganizationIdentityEvent = {
	id: "event-1",
	type: "organization.membership.upserted",
	occurredAt: "2026-08-29T00:00:00.000Z",
	organization: {
		id: "org-1",
		name: "Cina Group",
		slug: "cina-group",
		status: "active",
		updatedAt: "2026-08-29T00:00:00.000Z",
	},
	membership: {
		subject: "user-1",
		email: "user@example.com",
		roles: ["admin", "member"],
		status: "active",
		updatedAt: "2026-08-29T00:00:00.000Z",
	},
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("organization identity transactional outbox", () => {
	it("validates the immutable JSONB payload and stable row event id", () => {
		expect(parseOrganizationIdentityOutboxEvent(event, "event-1")).toEqual(
			event,
		);
		expect(() =>
			parseOrganizationIdentityOutboxEvent(event, "different-event"),
		).toThrow("does not match");
		expect(() =>
			parseOrganizationIdentityOutboxEvent({
				...event,
				membership: { ...event.membership, roles: [] },
			}),
		).toThrow("requires a role");
	});

	it("claims, batches, and marks only Queue-confirmed events", async () => {
		const queries: string[] = [];
		const query = vi.fn(async (sql: string) => {
			queries.push(sql);
			if (sql.includes("FOR UPDATE SKIP LOCKED")) {
				return {
					rows: [{ id: "41", event_id: event.id, payload: event, attempts: 1 }],
					rowCount: 1,
				};
			}
			return { rows: [], rowCount: 1 };
		});
		const database = { query } as unknown as CinaAuthDatabase;
		const sendBatch = vi.fn(async () => undefined);
		const env = {
			CINATOKEN_IDENTITY_EVENTS_QUEUE: { sendBatch },
		} as unknown as CloudflareBindings;

		await expect(
			drainOrganizationIdentityOutbox(env, database),
		).resolves.toEqual({ claimed: 1, queued: 1, batches: 1 });
		expect(sendBatch).toHaveBeenCalledWith([
			{ body: event, contentType: "json" },
		]);
		expect(queries.some((sql) => sql.includes('SET "queued_at"'))).toBe(true);
		expect(queries.some((sql) => sql.includes('SET "available_at"'))).toBe(
			false,
		);
	});

	it("releases the lease with backoff when Queue persistence fails", async () => {
		const queries: string[] = [];
		const query = vi.fn(async (sql: string) => {
			queries.push(sql);
			if (sql.includes("FOR UPDATE SKIP LOCKED")) {
				return {
					rows: [{ id: "42", event_id: event.id, payload: event, attempts: 2 }],
					rowCount: 1,
				};
			}
			return { rows: [], rowCount: 1 };
		});
		const database = { query } as unknown as CinaAuthDatabase;
		const env = {
			CINATOKEN_IDENTITY_EVENTS_QUEUE: {
				sendBatch: vi.fn(async () => {
					throw new Error("queue unavailable");
				}),
			},
		} as unknown as CloudflareBindings;

		await expect(
			drainOrganizationIdentityOutbox(env, database),
		).rejects.toThrow("queue unavailable");
		expect(queries.some((sql) => sql.includes('SET "available_at"'))).toBe(
			true,
		);
		expect(queries.some((sql) => sql.includes('SET "queued_at"'))).toBe(false);
	});

	it("replays retained event ids without changing their idempotency key", async () => {
		const query = vi.fn(async () => ({
			rows: [{ event_id: "event-1" }, { event_id: "event-2" }],
		}));
		const database = { query } as unknown as CinaAuthDatabase;

		await expect(
			replayOrganizationIdentityOutbox(database, [
				"event-1",
				"event-1",
				"event-2",
			]),
		).resolves.toBe(2);
		expect(query.mock.calls[0]?.[1]).toEqual([["event-1", "event-2"]]);
	});

	it("rejects ambiguous or oversized operations replay input", () => {
		expect(
			parseOrganizationIdentityOutboxReplayInput({
				eventIds: [" event-1 ", "event-1", "event-2"],
			}),
		).toEqual({ eventIds: ["event-1", "event-2"] });
		expect(() =>
			parseOrganizationIdentityOutboxReplayInput({
				eventIds: ["event-1"],
				all: true,
			}),
		).toThrow("unknown fields");
		expect(() =>
			parseOrganizationIdentityOutboxReplayInput({ eventIds: ["not valid"] }),
		).toThrow("valid event ids");
	});
});

describe("organization identity event delivery", () => {
	it("signs the exact request body and uses the private Service Binding", async () => {
		const secret = "identity-events-secret-".repeat(3);
		vi.spyOn(Date, "now").mockReturnValue(
			new Date("2026-08-29T00:05:00.000Z").getTime(),
		);
		const requests: Request[] = [];
		const serviceFetch = vi.fn(async (request: Request) => {
			requests.push(request);
			return new Response(null, { status: 202 });
		});
		vi.stubGlobal("fetch", vi.fn());

		await deliverOrganizationIdentityEvent(
			{
				CINATOKEN_IDENTITY_EVENTS_SERVICE: { fetch: serviceFetch },
				CINATOKEN_IDENTITY_EVENTS_SECRET: secret,
			},
			event,
		);

		expect(serviceFetch).toHaveBeenCalledOnce();
		expect(fetch).not.toHaveBeenCalled();
		const request = requests[0]!;
		expect(request.url).toBe(
			"https://cinatoken.com/api/integrations/cinaauth/organization-events",
		);
		const body = await request.text();
		const timestamp = request.headers.get("x-cinaauth-event-timestamp");
		expect(timestamp).toBe("1787961900");
		const signature = await hmacSha256Hex(secret, `${timestamp}.${body}`);
		expect(request.headers.get("x-cinaauth-signature")).toBe(`v1=${signature}`);
	});

	it("acks accepted events and retries transient receiver failures", async () => {
		const serviceFetch = vi
			.fn<(request: Request) => Promise<Response>>()
			.mockResolvedValueOnce(new Response(null, { status: 200 }))
			.mockResolvedValueOnce(new Response(null, { status: 503 }));
		const accepted = {
			body: event,
			id: "queue-1",
			attempts: 1,
			ack: vi.fn(),
			retry: vi.fn(),
		};
		const failed = {
			body: { ...event, id: "event-2" },
			id: "queue-2",
			attempts: 2,
			ack: vi.fn(),
			retry: vi.fn(),
		};

		await handleOrganizationIdentityBatch(
			{ messages: [accepted, failed] },
			{
				CINATOKEN_IDENTITY_EVENTS_SERVICE: { fetch: serviceFetch },
				CINATOKEN_IDENTITY_EVENTS_SECRET: "identity-events-secret-".repeat(3),
			},
		);

		expect(accepted.ack).toHaveBeenCalledOnce();
		expect(accepted.retry).not.toHaveBeenCalled();
		expect(failed.ack).not.toHaveBeenCalled();
		expect(failed.retry).toHaveBeenCalledWith({ delaySeconds: 40 });
	});
});
