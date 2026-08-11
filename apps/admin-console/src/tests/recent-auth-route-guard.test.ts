import { ADMIN_OIDC_STEP_UP_MAX_AGE_SECONDS } from "@cinaauth/auth-web-contract";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ADMIN_OIDC_RECENT_AUTH_COOKIE,
	sealRecentAuthenticationProof,
} from "@/lib/cinaauth/oidc-transaction";
import type { AdminSession } from "@/lib/cinaauth/types";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	session: vi.fn(),
	transactionSecret: vi.fn(),
}));

vi.mock("@/lib/cinaauth/client", () => ({
	cinaauthFetch: mocks.fetch,
}));
vi.mock("@/lib/cinaauth/session", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@/lib/cinaauth/session")>();
	return { ...mod, resolveAdminSession: mocks.session };
});
vi.mock("@/lib/cinaauth/oidc-secrets", () => ({
	getAdminOidcTransactionSecret: mocks.transactionSecret,
}));

const SIGNING_SECRET = "recent-auth-test-secret-with-at-least-32-characters";
const mockFetch = mocks.fetch;
const mockSession = mocks.session;
const mockTransactionSecret = mocks.transactionSecret;

const SUPER_ADMIN: AdminSession = {
	userId: "admin-1",
	role: "super_admin",
	email: "root@example.com",
	impersonatedBy: null,
};
const SECURITY_ADMIN: AdminSession = {
	...SUPER_ADMIN,
	userId: "security-1",
	role: "security_admin",
};
const IMPERSONATING: AdminSession = {
	userId: "user-2",
	role: "user",
	email: "user@example.com",
	impersonatedBy: "admin-1",
};

function request(
	path: string,
	method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
	body?: unknown,
	proof?: string,
): NextRequest {
	const cookie = [
		"session=valid",
		proof ? `${ADMIN_OIDC_RECENT_AUTH_COOKIE}=${proof}` : null,
	]
		.filter(Boolean)
		.join("; ");
	return new NextRequest(new URL(`https://admin.test${path}`), {
		method,
		headers: {
			cookie,
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const sealProof = (
	subject = SUPER_ADMIN.userId,
	ageSeconds = 0,
): Promise<string> =>
	sealRecentAuthenticationProof(
		subject,
		Math.floor(Date.now() / 1000) - ageSeconds,
		SIGNING_SECRET,
	);

const expectSessionNotFresh = async (response: Response) => {
	expect(response.status).toBe(403);
	expect(response.headers.get("cache-control")).toBe("no-store");
	expect(await response.json()).toEqual({
		ok: false,
		error: {
			code: "SESSION_NOT_FRESH",
			message: "Recent authentication is required",
			status: 403,
		},
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	mockSession.mockResolvedValue(SUPER_ADMIN);
	mockTransactionSecret.mockResolvedValue(SIGNING_SECRET);
	mockFetch.mockResolvedValue({ ok: true, data: {} });
});

describe("recent Admin authentication proof", () => {
	it("accepts a valid proof bound to the current session subject", async () => {
		const proof = await sealProof();

		await expect(
			requireRecentAdminAuthentication(
				request("/api/admin/users/user-2/ban", "POST", undefined, proof),
				SUPER_ADMIN,
			),
		).resolves.toBeUndefined();
	});

	it("rejects a missing proof with a structured non-cacheable response", async () => {
		let rejection: unknown;
		try {
			await requireRecentAdminAuthentication(
				request("/api/admin/users/user-2/ban", "POST"),
				SUPER_ADMIN,
			);
		} catch (error) {
			rejection = error;
		}

		expect(rejection).toBeInstanceOf(Response);
		await expectSessionNotFresh(rejection as Response);
	});

	it.each([
		["expired", SUPER_ADMIN.userId, ADMIN_OIDC_STEP_UP_MAX_AGE_SECONDS + 1],
		["wrong-subject", "another-admin", 0],
	] as const)("rejects a %s proof", async (_name, subject, ageSeconds) => {
		const proof = await sealProof(subject, ageSeconds);
		let rejection: unknown;
		try {
			await requireRecentAdminAuthentication(
				request("/api/admin/users/user-2/ban", "POST", undefined, proof),
				SUPER_ADMIN,
			);
		} catch (error) {
			rejection = error;
		}

		expect(rejection).toBeInstanceOf(Response);
		await expectSessionNotFresh(rejection as Response);
	});
});

describe("high-risk Admin BFF routes", () => {
	const cases = [
		[
			"ban",
			(proof?: string) =>
				import("@/app/api/admin/users/[id]/ban/route").then(({ POST }) =>
					POST(
						request(
							"/api/admin/users/user-2/ban",
							"POST",
							{ banReason: "policy violation" },
							proof,
						),
						params("user-2"),
					),
				),
		],
		[
			"unban",
			(proof?: string) =>
				import("@/app/api/admin/users/[id]/unban/route").then(({ POST }) =>
					POST(
						request("/api/admin/users/user-2/unban", "POST", undefined, proof),
						params("user-2"),
					),
				),
		],
		[
			"delete",
			(proof?: string) =>
				import("@/app/api/admin/users/[id]/route").then(({ DELETE }) =>
					DELETE(
						request("/api/admin/users/user-2", "DELETE", undefined, proof),
						params("user-2"),
					),
				),
		],
		[
			"update",
			(proof?: string) =>
				import("@/app/api/admin/users/[id]/route").then(({ PATCH }) =>
					PATCH(
						request(
							"/api/admin/users/user-2",
							"PATCH",
							{ name: "Updated user" },
							proof,
						),
						params("user-2"),
					),
				),
		],
		[
			"set-role",
			(proof?: string) =>
				import("@/app/api/admin/users/[id]/route").then(({ PATCH }) =>
					PATCH(
						request(
							"/api/admin/users/user-2",
							"PATCH",
							{ role: "security_admin" },
							proof,
						),
						params("user-2"),
					),
				),
		],
		[
			"reset-password",
			(proof?: string) =>
				import("@/app/api/admin/users/[id]/reset-password/route").then(
					({ POST }) =>
						POST(
							request(
								"/api/admin/users/user-2/reset-password",
								"POST",
								{ newPassword: "StrongPassword123" },
								proof,
							),
							params("user-2"),
						),
				),
		],
		[
			"reset-2fa",
			(proof?: string) =>
				import("@/app/api/admin/users/[id]/reset-2fa/route").then(({ POST }) =>
					POST(
						request(
							"/api/admin/users/user-2/reset-2fa",
							"POST",
							undefined,
							proof,
						),
						params("user-2"),
					),
				),
		],
		[
			"impersonate",
			(proof?: string) =>
				import("@/app/api/admin/users/[id]/impersonate/route").then(
					({ POST }) =>
						POST(
							request(
								"/api/admin/users/user-2/impersonate",
								"POST",
								undefined,
								proof,
							),
							params("user-2"),
						),
				),
		],
		[
			"batch-ban",
			(proof?: string) =>
				import("@/app/api/admin/users/batch/route").then(({ POST }) =>
					POST(
						request(
							"/api/admin/users/batch",
							"POST",
							{ action: "ban", userIds: ["user-2"] },
							proof,
						),
					),
				),
		],
		[
			"batch-delete",
			(proof?: string) =>
				import("@/app/api/admin/users/batch/route").then(({ POST }) =>
					POST(
						request(
							"/api/admin/users/batch",
							"POST",
							{ action: "delete", userIds: ["user-2"] },
							proof,
						),
					),
				),
		],
		[
			"revoke-one-session",
			(proof?: string) =>
				import("@/app/api/admin/sessions/revoke/route").then(({ POST }) =>
					POST(
						request(
							"/api/admin/sessions/revoke",
							"POST",
							{ sessionId: "session-2" },
							proof,
						),
					),
				),
		],
		[
			"revoke-all-user-sessions",
			(proof?: string) =>
				import("@/app/api/admin/sessions/revoke/route").then(({ POST }) =>
					POST(
						request(
							"/api/admin/sessions/revoke",
							"POST",
							{ userId: "user-2" },
							proof,
						),
					),
				),
		],
	] as const;

	it.each(
		cases,
	)("requires recent authentication for %s", async (_name, invoke) => {
		const response = await invoke();

		await expectSessionNotFresh(response);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it.each(
		cases,
	)("accepts a valid subject-bound proof for %s", async (_name, invoke) => {
		const response = await invoke(await sealProof());

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalled();
	});

	it("checks permission before opening the proof", async () => {
		mockSession.mockResolvedValue(SECURITY_ADMIN);
		const { DELETE } = await import("@/app/api/admin/users/[id]/route");

		const response = await DELETE(
			request(
				"/api/admin/users/user-2",
				"DELETE",
				undefined,
				"malformed-proof",
			),
			params("user-2"),
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			error: { code: "FORBIDDEN" },
		});
		expect(mockTransactionSecret).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("checks the action-specific batch permission before opening the proof", async () => {
		mockSession.mockResolvedValue(SECURITY_ADMIN);
		const { POST } = await import("@/app/api/admin/users/batch/route");

		const deleteResponse = await POST(
			request(
				"/api/admin/users/batch",
				"POST",
				{ action: "delete", userIds: ["user-2"] },
				"malformed-proof",
			),
		);

		expect(deleteResponse.status).toBe(403);
		expect(await deleteResponse.json()).toMatchObject({
			error: { code: "FORBIDDEN" },
		});
		expect(mockTransactionSecret).not.toHaveBeenCalled();

		const banResponse = await POST(
			request(
				"/api/admin/users/batch",
				"POST",
				{ action: "ban", userIds: ["user-2"] },
				"malformed-proof",
			),
		);

		await expectSessionNotFresh(banResponse);
		expect(mockTransactionSecret).toHaveBeenCalledTimes(1);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("does not require recent-auth proof to stop impersonation", async () => {
		mockSession.mockResolvedValue(IMPERSONATING);
		const { POST } = await import(
			"@/app/api/admin/users/impersonate/stop/route"
		);

		const response = await POST(
			request(
				"/api/admin/users/impersonate/stop",
				"POST",
				undefined,
				"malformed-proof",
			),
		);

		expect(response.status).toBe(200);
		expect(mockTransactionSecret).not.toHaveBeenCalled();
		expect(mockFetch).toHaveBeenCalledWith(
			"/admin/stop-impersonating",
			expect.objectContaining({ method: "POST" }),
		);
	});
});
