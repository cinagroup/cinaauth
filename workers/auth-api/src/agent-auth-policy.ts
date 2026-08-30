import type { Capability } from "@cinaauth/agent-auth";
import { agentAuth } from "@cinaauth/agent-auth";
import type { CinaAuthPlugin } from "cinaauth";

const IDENTITY_PROFILE_CAPABILITY = {
	name: "identity.profile.read",
	description: "Read the approved user's basic CinaSeek Identity profile.",
	approvalStrength: "session",
	grantTTL: 24 * 60 * 60,
	output: {
		type: "object",
		properties: {
			id: { type: "string" },
			name: { type: "string" },
			email: { type: "string" },
		},
		required: ["id", "name", "email"],
	},
} satisfies Capability;

const AGENT_CAPABILITIES = [IDENTITY_PROFILE_CAPABILITY] as const;

/** Public-safe Agent Auth policy details shown in the Admin control plane. */
export const AGENT_AUTH_ADMIN_POLICY = {
	enabled: true,
	providerName: "CinaSeek Identity",
	providerDescription:
		"User-approved identity access for AI agents through CinaSeek Identity.",
	modes: ["delegated"],
	approvalMethods: ["device_authorization"],
	allowDynamicHostRegistration: true,
	freshSessionWindow: 15 * 60,
	agentSessionTTL: 60 * 60,
	agentMaxLifetime: 24 * 60 * 60,
	maxAgentsPerUser: 10,
	capabilities: AGENT_CAPABILITIES.map(
		({ name, description, approvalStrength, grantTTL }) => ({
			name,
			description,
			approvalStrength,
			grantTTL,
		}),
	),
} as const;

export const getAgentCapabilityDescription = (name: string) =>
	AGENT_CAPABILITIES.find((capability) => capability.name === name)
		?.description ?? "Access a capability requested by this agent.";

/** Creates the production Agent Auth plugin with a deliberately narrow policy. */
export const createAgentAuthPlugin = (accountOrigin: string): CinaAuthPlugin =>
	agentAuth({
		providerName: AGENT_AUTH_ADMIN_POLICY.providerName,
		providerDescription: AGENT_AUTH_ADMIN_POLICY.providerDescription,
		modes: [...AGENT_AUTH_ADMIN_POLICY.modes],
		approvalMethods: [...AGENT_AUTH_ADMIN_POLICY.approvalMethods],
		deviceAuthorizationPage: `${accountOrigin}/device/capabilities`,
		allowDynamicHostRegistration:
			AGENT_AUTH_ADMIN_POLICY.allowDynamicHostRegistration,
		freshSessionWindow: AGENT_AUTH_ADMIN_POLICY.freshSessionWindow,
		agentSessionTTL: AGENT_AUTH_ADMIN_POLICY.agentSessionTTL,
		agentMaxLifetime: AGENT_AUTH_ADMIN_POLICY.agentMaxLifetime,
		maxAgentsPerUser: AGENT_AUTH_ADMIN_POLICY.maxAgentsPerUser,
		capabilities: [...AGENT_CAPABILITIES],
		onExecute: ({ capability, agentSession }) => {
			if (capability !== IDENTITY_PROFILE_CAPABILITY.name) {
				throw new Error("Unsupported agent capability");
			}
			return {
				id: agentSession.user.id,
				name: agentSession.user.name,
				email: agentSession.user.email,
			};
		},
	});
