import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchAuthRequest = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cinaauth/fetcher", () => ({
	fetchAuthRequest: mockFetchAuthRequest,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("cinaauth root control client", () => {
	it("uses POST and never remounts the path below /api/auth", async () => {
		mockFetchAuthRequest.mockResolvedValueOnce(
			Response.json({ ok: true, data: { revision: 0 } }),
		);
		const { cinaauthControlFetch } = await import(
			"@/lib/cinaauth/control-client"
		);
		const response = await cinaauthControlFetch<{ revision: number }>(
			"/api/admin/configuration/delivery/status",
			{ cookie: "session=valid", body: {} },
		);

		expect(response).toEqual({ ok: true, data: { revision: 0 } });
		const upstream = mockFetchAuthRequest.mock.calls[0]?.[0] as Request;
		expect(upstream.method).toBe("POST");
		expect(new URL(upstream.url).pathname).toBe(
			"/api/admin/configuration/delivery/status",
		);
		expect(upstream.headers.get("cookie")).toBe("session=valid");
		expect(upstream.cache).toBe("no-store");
	});

	it("rejects paths outside the fixed configuration control prefix", async () => {
		const { cinaauthControlFetch } = await import(
			"@/lib/cinaauth/control-client"
		);
		const response = await cinaauthControlFetch("/api/auth/admin/list-users", {
			cookie: "session=valid",
		});

		expect(response).toMatchObject({
			ok: false,
			error: { code: "CINAUTH_CONTROL_PATH_REJECTED" },
		});
		expect(mockFetchAuthRequest).not.toHaveBeenCalled();
	});

	it("rejects path traversal that would escape the control prefix", async () => {
		const { cinaauthControlFetch } = await import(
			"@/lib/cinaauth/control-client"
		);
		const response = await cinaauthControlFetch(
			"/api/admin/configuration/../../auth/admin/list-users",
			{ cookie: "session=valid" },
		);

		expect(response).toMatchObject({
			ok: false,
			error: { code: "CINAUTH_CONTROL_PATH_REJECTED" },
		});
		expect(mockFetchAuthRequest).not.toHaveBeenCalled();
	});
});
