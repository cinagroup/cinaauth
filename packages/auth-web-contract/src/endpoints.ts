export const AUTH_WEB_ENDPOINTS = {
	capabilities: "/api/auth/capabilities",
	entitlements: "/api/auth/entitlements",
	session: "/api/auth/get-session",
	signInEmail: "/api/auth/sign-in/email",
	signOut: "/api/auth/sign-out",
	admin: {
		listUsers: "/api/auth/admin/list-users",
		getUser: "/api/auth/admin/get-user",
		listUserSessions: "/api/auth/admin/list-user-sessions",
		listUserWallets: "/api/auth/admin/list-user-wallets",
		statsOverview: "/api/auth/admin/stats/overview",
		statsSignups: "/api/auth/admin/stats/signups",
		statsSecurityToday: "/api/auth/admin/stats/security-today",
	},
} as const;
