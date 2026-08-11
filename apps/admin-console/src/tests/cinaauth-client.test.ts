import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("@/lib/cinaauth/fetcher", () => ({
	fetchAuthRequest: fetchMock,
}));

import { cinaauthFetch } from "@/lib/cinaauth/client";

beforeEach(() => {
	fetchMock.mockReset();
});

describe("cinaauthFetch error contracts", () => {
	it("treats a successful empty 204 response as success", async () => {
		fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

		const response = await cinaauthFetch("/sso/verify-domain", {
			method: "POST",
			body: { providerId: "acme-oidc" },
		});

		expect(response).toEqual({ ok: true });
	});

	it("preserves a structured upstream step-up error", async () => {
		fetchMock.mockResolvedValue(
			Response.json(
				{
					code: "SESSION_NOT_FRESH",
					message: "Recent authentication required",
				},
				{ status: 403 },
			),
		);

		const response = await cinaauthFetch("/admin/ban-user", {
			method: "POST",
			body: { userId: "u1" },
		});

		expect(response).toEqual({
			ok: false,
			error: {
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication required",
				status: 403,
			},
		});
	});

	it("uses a stable fallback for a non-JSON upstream failure", async () => {
		fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }));

		const response = await cinaauthFetch("/admin/ban-user");

		expect(response).toEqual({
			ok: false,
			error: {
				code: "CINAUTH_503",
				message: "CinaSeek Identity request failed",
				status: 503,
			},
		});
	});

	it("does not expose unknown upstream error details", async () => {
		fetchMock.mockResolvedValue(
			Response.json(
				{ code: "DATABASE_FAILURE", message: "postgresql://secret-host" },
				{ status: 500 },
			),
		);

		const response = await cinaauthFetch("/admin/ban-user");

		expect(response).toEqual({
			ok: false,
			error: {
				code: "CINAUTH_500",
				message: "CinaSeek Identity request failed",
				status: 500,
			},
		});
	});

	it("uses a branded fallback for an invalid successful response", async () => {
		fetchMock.mockResolvedValue(new Response("not-json", { status: 200 }));

		const response = await cinaauthFetch("/admin/list-users");

		expect(response).toEqual({
			ok: false,
			error: {
				code: "CINAUTH_INVALID_RESPONSE",
				message: "CinaSeek Identity returned an invalid response",
				status: 502,
			},
		});
	});

	it("uses a branded fallback without exposing transport errors", async () => {
		fetchMock.mockRejectedValue(new Error("postgresql://secret-host"));

		const response = await cinaauthFetch("/admin/list-users");

		expect(response).toEqual({
			ok: false,
			error: {
				code: "CINAUTH_UNREACHABLE",
				message: "CinaSeek Identity is unavailable",
			},
		});
		expect(JSON.stringify(response)).not.toContain("secret-host");
	});
});
