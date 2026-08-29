import { getAgentCapabilityDescription } from "./agent-auth-policy";

type QueryRows<Row extends Record<string, unknown>> = {
	rows: Row[];
};

export type AgentApprovalQuery = <Row extends Record<string, unknown>>(
	text: string,
	values: readonly unknown[],
) => Promise<QueryRows<Row>>;

type AgentApprovalRow = {
	id: string;
	name: string;
	mode: string;
	hostName: string | null;
	requestedCapabilities: string | null;
};

export type AgentApprovalPreview = {
	agent: {
		id: string;
		name: string;
		mode: string;
		hostName: string | null;
	};
	capabilities: Array<{
		name: string;
		description: string;
	}>;
};

/** Normalizes an RFC 8628-style user code and rejects malformed values. */
export const normalizeAgentUserCode = (code: string) => {
	const stripped = code.replaceAll(/[^A-Z0-9]/gi, "").toUpperCase();
	if (!/^[A-Z0-9]{8}$/.test(stripped)) return null;
	return `${stripped.slice(0, 4)}-${stripped.slice(4)}`;
};

const base64url = (bytes: Uint8Array) => {
	const lookup =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let result = "";
	for (let index = 0; index < bytes.length; index += 3) {
		const first = bytes[index] ?? 0;
		const second = bytes[index + 1] ?? 0;
		const third = bytes[index + 2] ?? 0;
		result += lookup[first >> 2];
		result += lookup[((first & 0x03) << 4) | (second >> 4)];
		if (index + 1 < bytes.length) {
			result += lookup[((second & 0x0f) << 2) | (third >> 6)];
		}
		if (index + 2 < bytes.length) result += lookup[third & 0x3f];
	}
	return result;
};

export const hashAgentUserCode = async (code: string) => {
	const normalized = normalizeAgentUserCode(code);
	if (!normalized) return null;
	const digest = await globalThis.crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(normalized),
	);
	return base64url(new Uint8Array(digest));
};

/**
 * Returns an informed-consent preview only when the agent and an unexpired,
 * pending approval request match the submitted one-time user code.
 */
export const getAgentApprovalPreview = async (
	query: AgentApprovalQuery,
	agentId: string,
	userCode: string,
): Promise<AgentApprovalPreview | null> => {
	if (!/^[A-Za-z0-9_-]{1,128}$/.test(agentId)) return null;
	const userCodeHash = await hashAgentUserCode(userCode);
	if (!userCodeHash) return null;

	const agentResult = await query<AgentApprovalRow>(
		`SELECT
			agent."id" AS "id",
			agent."name" AS "name",
			agent."mode" AS "mode",
			host."name" AS "hostName",
			approval."capabilities" AS "requestedCapabilities"
		 FROM "approvalRequest" approval
		 JOIN "agent" agent ON agent."id" = approval."agentId"
		 LEFT JOIN "agentHost" host ON host."id" = agent."hostId"
		 WHERE approval."agentId" = $1
			AND approval."userCodeHash" = $2
			AND approval."method" = 'device_authorization'
			AND approval."status" = 'pending'
			AND approval."expiresAt" > CURRENT_TIMESTAMP
			AND agent."status" = 'pending'
		 LIMIT 1`,
		[agentId, userCodeHash],
	);
	const approval = agentResult.rows[0];
	if (!approval) return null;
	const { requestedCapabilities, ...agent } = approval;
	const capabilities = (requestedCapabilities ?? "")
		.split(/\s+/)
		.filter((capability) => capability.length > 0);

	return {
		agent,
		capabilities: capabilities.map((capability) => ({
			name: capability,
			description: getAgentCapabilityDescription(capability),
		})),
	};
};
