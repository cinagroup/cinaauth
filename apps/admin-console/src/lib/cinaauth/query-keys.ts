/** TanStack Query key factory. Centralized so cache invalidation is consistent. */
export const qk = {
	users: (params: Record<string, unknown>) => ["users", params] as const,
	user: (id: string) => ["user", id] as const,
	userWallets: (id: string) => ["user", id, "wallets"] as const,
	userSessions: (id: string) => ["user", id, "sessions"] as const,
	sessions: (params: Record<string, unknown>) => ["sessions", params] as const,
	audit: (params: Record<string, unknown>) => ["audit", params] as const,
	statsOverview: ["stats", "overview"] as const,
	statsSignups: (range: string) => ["stats", "signups", range] as const,
	statsSecurity: ["stats", "security"] as const,
};
