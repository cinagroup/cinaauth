import type { ApiKeyDTO, StandardResponse } from "@cinaauth/auth-web-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminControlPermission } from "@/lib/auth-guard";
import { buildApiKeyRotationCreateBody } from "@/lib/cinaauth/api-key-admin";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { resolveAdminSession } from "@/lib/cinaauth/session";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

type CreatedApiKey = {
	id?: string;
	key?: string;
};

type DeleteApiKeyResult = {
	success?: boolean;
};

const noStoreHeaders = { "Cache-Control": "no-store" };

const deleteSucceeded = (
	response: StandardResponse<DeleteApiKeyResult>,
): boolean => response.ok && response.data?.success === true;

const boundaryFailure = (
	response: StandardResponse<unknown>,
): {
	status: number;
	error: { code: string; message: string; status?: number };
} | null => {
	if (response.ok || !response.error) return null;
	const status = adminUpstreamResponseStatus(response);
	return status === 401 || status === 403
		? { status, error: response.error }
		: null;
};

/**
 * POST /api/admin/api-keys/[id]/rotate — rotate the acting Admin's API key.
 *
 * The package does not expose an atomic rotation endpoint, so this handler
 * creates a configuration-equivalent replacement, revokes the old key, and
 * rolls the replacement back if the old-key revoke fails.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await resolveAdminSession(request);
	if (!session) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}
	try {
		requireAdminControlPermission(session, "integration.api-key.rotate");
	} catch (error) {
		return error as Response;
	}
	const { id } = await params;
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}

	const cookie = request.headers.get("cookie") ?? "";
	const existing = await cinaauthFetch<ApiKeyDTO>(
		`/api-key/get?id=${encodeURIComponent(id)}`,
		{ cookie },
	);
	if (!existing.ok || !existing.data) {
		return NextResponse.json(existing, {
			status: adminUpstreamResponseStatus(existing, { allowNotFound: true }),
			headers: noStoreHeaders,
		});
	}

	const createBody = buildApiKeyRotationCreateBody(existing.data);
	if (!createBody.ok) {
		return NextResponse.json(
			{
				ok: false,
				error: { ...createBody.error, status: 409 },
				data: { oldKeyId: id, oldKeyState: "active" },
			},
			{ status: 409, headers: noStoreHeaders },
		);
	}

	const replacement = await cinaauthFetch<CreatedApiKey>("/api-key/create", {
		method: "POST",
		body: createBody.value,
		cookie,
	});
	if (!replacement.ok) {
		return NextResponse.json(replacement, {
			status: adminUpstreamResponseStatus(replacement),
			headers: noStoreHeaders,
		});
	}

	const replacementId = replacement.data?.id;
	const replacementSecret = replacement.data?.key;
	if (!replacementId || !replacementSecret) {
		const rolledBack = replacementId
			? await cinaauthFetch<DeleteApiKeyResult>("/api-key/delete", {
					method: "POST",
					body: { keyId: replacementId },
					cookie,
				})
			: null;
		const state =
			rolledBack && deleteSucceeded(rolledBack)
				? "invalid_replacement_revoked_old_retained"
				: "replacement_identity_unknown_old_retained";
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "API_KEY_ROTATION_INVALID_REPLACEMENT",
					message:
						"CinaSeek returned an incomplete replacement. The old key remains active; verify the personal key list before retrying.",
					status: 502,
				},
				data: { oldKeyId: id, replacementKeyId: replacementId, state },
			},
			{ status: 502, headers: noStoreHeaders },
		);
	}

	const oldKeyDelete = await cinaauthFetch<DeleteApiKeyResult>(
		"/api-key/delete",
		{
			method: "POST",
			body: { keyId: id },
			cookie,
		},
	);
	if (deleteSucceeded(oldKeyDelete)) {
		return NextResponse.json(replacement, {
			status: 200,
			headers: noStoreHeaders,
		});
	}

	const rollback = await cinaauthFetch<DeleteApiKeyResult>("/api-key/delete", {
		method: "POST",
		body: { keyId: replacementId },
		cookie,
	});
	const rollbackSucceeded = deleteSucceeded(rollback);
	const upstreamBoundary = boundaryFailure(oldKeyDelete);
	const error = upstreamBoundary?.error ?? {
		code: rollbackSucceeded
			? "API_KEY_ROTATION_REVOKE_FAILED"
			: "API_KEY_ROTATION_ROLLBACK_FAILED",
		message: rollbackSucceeded
			? "The old API key could not be revoked. The replacement was rolled back and the old key remains active."
			: "The old key could not be revoked and replacement rollback also failed. Both keys may be active; revoke the replacement explicitly.",
		status: 502,
	};

	return NextResponse.json(
		{
			ok: false,
			error,
			data: {
				oldKeyId: id,
				replacementKeyId: replacementId,
				state: rollbackSucceeded
					? "replacement_revoked_old_retained"
					: "old_and_replacement_may_be_active",
			},
		},
		{
			status: upstreamBoundary?.status ?? 502,
			headers: noStoreHeaders,
		},
	);
}
