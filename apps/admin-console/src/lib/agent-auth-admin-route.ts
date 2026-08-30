import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AgentAuthAdminData } from "@/lib/agent-auth";
import { requireAdmin, requireAdminControlPermission } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { requireRecentAdminAuthentication } from "@/lib/recent-auth-guard";

const noStoreHeaders = { "Cache-Control": "no-store" };
const RESOURCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

type AgentAuthResourcePath = "agents" | "hosts" | "grants" | "approvals";
type AgentAuthMutationAction = "revoke" | "deny";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const unwrapWorkerEnvelope = (value: unknown): unknown =>
	isRecord(value) && value.ok === true && "data" in value ? value.data : value;

const isAgentAuthAdminData = (value: unknown): value is AgentAuthAdminData => {
	if (!isRecord(value) || !isRecord(value.policy) || !isRecord(value.summary)) {
		return false;
	}
	return (
		typeof value.policy.enabled === "boolean" &&
		typeof value.policy.providerName === "string" &&
		Array.isArray(value.policy.modes) &&
		Array.isArray(value.policy.approvalMethods) &&
		Array.isArray(value.policy.capabilities) &&
		typeof value.summary.agentCount === "number" &&
		typeof value.summary.hostCount === "number" &&
		Array.isArray(value.agents) &&
		Array.isArray(value.hosts) &&
		Array.isArray(value.grants) &&
		Array.isArray(value.approvals) &&
		Number.isSafeInteger(value.limit)
	);
};

const impersonationForbidden = () =>
	NextResponse.json(
		{
			ok: false,
			error: {
				code: "IMPERSONATED_SESSION_FORBIDDEN",
				message: "Agent Auth changes are unavailable while impersonating",
				status: 403,
			},
		},
		{ status: 403, headers: noStoreHeaders },
	);

/** Read the redacted Agent Auth policy and inventory through the Admin BFF. */
export const getAgentAuthAdminData = async (request: NextRequest) => {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.agent-auth.read");
	} catch (error) {
		return error as Response;
	}
	const response = await cinaauthFetch<AgentAuthAdminData>(
		"/admin/agent-auth?limit=100",
		{ cookie: request.headers.get("cookie") ?? "" },
	);
	if (!response.ok) {
		return NextResponse.json(response, {
			status: adminUpstreamResponseStatus(response),
			headers: noStoreHeaders,
		});
	}
	const data = unwrapWorkerEnvelope(response.data);
	if (!isAgentAuthAdminData(data)) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "CINAUTH_INVALID_RESPONSE",
					message: "CinaSeek Identity returned an invalid Agent Auth inventory",
				},
			},
			{ status: 502, headers: noStoreHeaders },
		);
	}
	return NextResponse.json({ ok: true, data }, { headers: noStoreHeaders });
};

/** Execute one recent-authenticated Agent Auth revocation or denial. */
export const mutateAgentAuthAdminResource = async (
	request: NextRequest,
	params: Promise<{ id: string }>,
	resource: AgentAuthResourcePath,
	action: AgentAuthMutationAction,
) => {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;
	try {
		requireAdminControlPermission(session, "integration.agent-auth.manage");
	} catch (error) {
		return error as Response;
	}
	if (session.impersonatedBy) return impersonationForbidden();
	const { id } = await params;
	if (!RESOURCE_ID_PATTERN.test(id)) {
		return NextResponse.json(
			{
				ok: false,
				error: {
					code: "BAD_REQUEST",
					message: "Invalid Agent Auth resource ID",
				},
			},
			{ status: 400, headers: noStoreHeaders },
		);
	}
	try {
		await requireRecentAdminAuthentication(request, session);
	} catch (error) {
		return error as Response;
	}
	const response = await cinaauthFetch(
		`/admin/agent-auth/${resource}/${encodeURIComponent(id)}/${action}`,
		{
			method: "POST",
			cookie: request.headers.get("cookie") ?? "",
		},
	);
	return NextResponse.json(response, {
		status: response.ok ? 200 : adminUpstreamResponseStatus(response),
		headers: noStoreHeaders,
	});
};
