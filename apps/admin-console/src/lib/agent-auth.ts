export type AgentAuthPolicy = {
	enabled: boolean;
	providerName: string;
	providerDescription: string;
	modes: string[];
	approvalMethods: string[];
	allowDynamicHostRegistration: boolean;
	freshSessionWindow: number;
	agentSessionTTL: number;
	agentMaxLifetime: number;
	maxAgentsPerUser: number;
	capabilities: Array<{
		name: string;
		description: string;
		approvalStrength: string | null;
		grantTTL: number | null;
	}>;
};

export type AgentAuthSummary = {
	agentCount: number;
	activeAgentCount: number;
	hostCount: number;
	activeHostCount: number;
	grantCount: number;
	pendingApprovalCount: number;
};

export type AgentAuthAgent = {
	id: string;
	name: string;
	userId: string | null;
	ownerName: string | null;
	ownerEmail: string | null;
	hostId: string;
	hostName: string | null;
	status: string;
	mode: string;
	lastUsedAt: string | null;
	activatedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
	updatedAt: string;
	grantCount: number;
	pendingApprovalCount: number;
};

export type AgentAuthHost = {
	id: string;
	name: string | null;
	userId: string | null;
	ownerName: string | null;
	ownerEmail: string | null;
	status: string;
	lastUsedAt: string | null;
	activatedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
	updatedAt: string;
	agentCount: number;
};

export type AgentAuthGrant = {
	id: string;
	agentId: string;
	agentName: string | null;
	capability: string;
	status: string;
	grantedBy: string | null;
	deniedBy: string | null;
	reason: string | null;
	expiresAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type AgentAuthApproval = {
	id: string;
	agentId: string | null;
	agentName: string | null;
	hostId: string | null;
	hostName: string | null;
	userId: string | null;
	ownerName: string | null;
	ownerEmail: string | null;
	method: string;
	status: string;
	capabilities: string[];
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
};

export type AgentAuthAdminData = {
	policy: AgentAuthPolicy;
	summary: AgentAuthSummary;
	agents: AgentAuthAgent[];
	hosts: AgentAuthHost[];
	grants: AgentAuthGrant[];
	approvals: AgentAuthApproval[];
	limit: number;
};
