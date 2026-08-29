import { describe, expect, it } from "vitest";
import {
	buildAgentApprovalStepUpPath,
	getAgentFlowError,
} from "./agent-authorization-flow";

describe("Agent authorization flow", () => {
	it("normalizes protocol and transport errors", () => {
		expect(
			getAgentFlowError(
				{
					error: "fresh_session_required",
					message: "Sign in again.",
				},
				"Approval failed",
			),
		).toEqual({
			code: "fresh_session_required",
			message: "Sign in again.",
		});
		expect(getAgentFlowError(null, "Approval failed")).toEqual({
			code: null,
			message: "Approval failed",
		});
	});

	it("preserves only the Agent approval route during fresh sign-in", () => {
		const path = buildAgentApprovalStepUpPath(
			"/device/capabilities?agent_id=agent_123&code=ABCD-2345",
		);
		const target = new URL(path, "https://accounts.cinaseek.ai");
		expect(target.pathname).toBe("/sign-in");
		expect(target.searchParams.get("mode")).toBe("step-up");
		expect(target.searchParams.get("callbackURL")).toBe(
			"/device/capabilities?agent_id=agent_123&code=ABCD-2345",
		);
		expect(
			new URL(
				buildAgentApprovalStepUpPath("https://attacker.example/collect"),
				"https://accounts.cinaseek.ai",
			).searchParams.get("callbackURL"),
		).toBe("/device/capabilities");
	});
});
