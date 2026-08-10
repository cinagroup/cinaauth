import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	runCli,
	runProductionLifecycleAcceptance,
} from "./run-production-lifecycle-acceptance.mjs";

const RUN_ID = "018f0000-0000-7000-8000-000000000001";
const USER_ID = "acceptance-user-id";
const ADMIN_COOKIE = "__Secure-cinaauth.session_token=admin-session";
const USER_COOKIE = "__Secure-cinaauth.session_token=impersonated-session";

const json = (body, init = {}) => Response.json(body, init);

const createSuccessfulFetch = () => {
	const calls = [];
	const fetchImpl = async (input, init = {}) => {
		const url = new URL(input);
		const body = init.body ? JSON.parse(init.body) : undefined;
		calls.push({ url, init, body });

		if (url.pathname === "/api/auth/admin/create-user") {
			assert.equal(init.headers.Cookie, ADMIN_COOKIE);
			assert.deepEqual(body, {
				email: `cinaauth-acceptance-${RUN_ID}@acceptance.invalid`,
				name: `CinaAuth Acceptance ${RUN_ID}`,
				role: "user",
			});
			return json({
				user: { id: USER_ID, email: body.email, role: "user" },
			});
		}

		if (url.pathname === "/api/auth/admin/impersonate-user") {
			const headers = new Headers();
			headers.append("Set-Cookie", `${USER_COOKIE}; Path=/; HttpOnly; Secure`);
			headers.append(
				"Set-Cookie",
				"__Secure-cinaauth.admin_session=admin; Path=/; HttpOnly; Secure",
			);
			return json(
				{
					user: { id: USER_ID },
					session: { id: "session-id", impersonatedBy: "admin-user-id" },
				},
				{ headers },
			);
		}

		if (url.pathname === "/api/auth/admin/remove-user") {
			assert.equal(init.headers.Cookie, ADMIN_COOKIE);
			assert.deepEqual(body, { userId: USER_ID });
			return json({ success: true });
		}

		if (url.pathname === "/api/auth/get-session") {
			assert.equal(init.headers.Cookie, USER_COOKIE);
			const removed = calls.some(
				(call) => call.url.pathname === "/api/auth/admin/remove-user",
			);
			return removed
				? json(null)
				: json({ user: { id: USER_ID }, session: { id: "session-id" } });
		}

		throw new Error(`Unexpected request ${url.pathname}`);
	};
	return { calls, fetchImpl };
};

describe("production lifecycle acceptance", () => {
	it("creates a synthetic user, validates a session, and always cleans it up", async () => {
		const { calls, fetchImpl } = createSuccessfulFetch();
		const progress = [];

		const result = await runProductionLifecycleAcceptance({
			adminCookie: ADMIN_COOKIE,
			fetchImpl,
			randomUUID: () => RUN_ID,
			onProgress: (step) => progress.push(step),
		});

		assert.deepEqual(result, { runId: RUN_ID, cleaned: true });
		assert.deepEqual(
			calls.map((call) => call.url.pathname),
			[
				"/api/auth/admin/create-user",
				"/api/auth/admin/impersonate-user",
				"/api/auth/get-session",
				"/api/auth/admin/remove-user",
				"/api/auth/get-session",
			],
		);
		assert.deepEqual(progress, [
			"synthetic-user-created",
			"impersonation-session-issued",
			"impersonation-session-validated",
			"synthetic-user-removed",
			"session-revocation-validated",
		]);
	});

	it("removes the synthetic user when session validation fails", async () => {
		const { calls, fetchImpl: successfulFetch } = createSuccessfulFetch();
		const fetchImpl = async (input, init) => {
			const url = new URL(input);
			if (url.pathname === "/api/auth/get-session") {
				return json({ user: { id: "wrong-user" }, session: { id: "session" } });
			}
			return successfulFetch(input, init);
		};

		await assert.rejects(
			runProductionLifecycleAcceptance({
				adminCookie: ADMIN_COOKIE,
				fetchImpl,
				randomUUID: () => RUN_ID,
			}),
			/impersonated session did not resolve/,
		);
		assert.equal(
			calls.some((call) => call.url.pathname === "/api/auth/admin/remove-user"),
			true,
		);
	});

	it("does not access production without the explicit run flag", async () => {
		const output = [];
		await runCli({ argv: [], env: {}, log: (message) => output.push(message) });
		assert.equal(output.length, 1);
		assert.match(output[0], /dry by default/);
	});

	it("fails loudly when cleanup is not acknowledged", async () => {
		const { fetchImpl: successfulFetch } = createSuccessfulFetch();
		const fetchImpl = async (input, init) => {
			const url = new URL(input);
			if (url.pathname === "/api/auth/admin/remove-user") {
				return json({ success: false }, { status: 503 });
			}
			return successfulFetch(input, init);
		};

		await assert.rejects(
			runProductionLifecycleAcceptance({
				adminCookie: ADMIN_COOKIE,
				fetchImpl,
				randomUUID: () => RUN_ID,
			}),
			(error) =>
				error instanceof AggregateError &&
				error.message.includes(RUN_ID) &&
				error.errors.some((item) => /cleanup failed/.test(item.message)),
		);
	});

	it("rejects malformed cookies and unapproved targets before fetching", async () => {
		let fetchCount = 0;
		const fetchImpl = async () => {
			fetchCount += 1;
			return json({});
		};

		await assert.rejects(
			runProductionLifecycleAcceptance({
				adminCookie: "invalid\r\ncookie=value",
				fetchImpl,
			}),
			/malformed/,
		);
		await assert.rejects(
			runProductionLifecycleAcceptance({
				adminCookie: ADMIN_COOKIE,
				baseUrl: "https://example.com",
				fetchImpl,
			}),
			/approved CinaAuth HTTPS origin/,
		);
		assert.equal(fetchCount, 0);
	});
});
