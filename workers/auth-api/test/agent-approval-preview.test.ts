import { describe, expect, it, vi } from "vitest";
import type { AgentApprovalQuery } from "../src/agent-approval-preview";
import {
	getAgentApprovalPreview,
	hashAgentUserCode,
	normalizeAgentUserCode,
} from "../src/agent-approval-preview";

describe("Agent approval preview", () => {
	it("normalizes device codes without accepting malformed input", () => {
		expect(normalizeAgentUserCode("abcd-2345")).toBe("ABCD-2345");
		expect(normalizeAgentUserCode("ABCD 2345")).toBe("ABCD-2345");
		expect(normalizeAgentUserCode("short")).toBeNull();
	});

	it("matches the Agent Auth SHA-256 base64url code hash", async () => {
		await expect(hashAgentUserCode("ABCD-2345")).resolves.toBe(
			"-6njsc8I4U3yojJjR8ONdjruD01ZxUcOeMsvSZtLU80",
		);
	});

	it("returns only a code-bound pending approval and its requested grants", async () => {
		const query = vi.fn(async () => ({
			rows: [
				{
					id: "agent_123",
					name: "Research assistant",
					mode: "delegated",
					hostName: "Codex",
					requestedCapabilities: "identity.profile.read",
				},
			],
		})) as AgentApprovalQuery;

		await expect(
			getAgentApprovalPreview(query, "agent_123", "ABCD-2345"),
		).resolves.toEqual({
			agent: {
				id: "agent_123",
				name: "Research assistant",
				mode: "delegated",
				hostName: "Codex",
			},
			capabilities: [
				{
					name: "identity.profile.read",
					description:
						"Read the approved user's basic CinaSeek Identity profile.",
				},
			],
		});
		expect(query).toHaveBeenCalledTimes(1);
	});

	it("rejects invalid identifiers before querying persistence", async () => {
		const query = vi.fn() as AgentApprovalQuery;
		await expect(
			getAgentApprovalPreview(query, "../agent", "ABCD-2345"),
		).resolves.toBeNull();
		expect(query).not.toHaveBeenCalled();
	});
});
