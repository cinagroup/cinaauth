export type Timestamp = string | number;

export type UserDTO = {
	id: string;
	email: string;
	name: string | null;
	role: string;
	banned: boolean;
	banReason: string | null;
	banExpires: Timestamp | null;
	twoFactorEnabled: boolean;
	emailVerified: boolean;
	createdAt: Timestamp;
	image: string | null;
};

export type WalletDTO = {
	address: string;
	chainId: number;
	isPrimary: boolean;
	boundAt: Timestamp;
	boundIp: string | null;
	boundSite: string | null;
};

export type SessionDTO = {
	id: string;
	userId: string;
	createdAt: Timestamp;
	expiresAt: Timestamp;
	ipAddress: string | null;
	userAgent: string | null;
};

export type AuditLogDTO = {
	id: string;
	timestamp: string;
	category: string;
	action: string;
	result: "success" | "failure";
	actorId: string | null;
	actorRole: string | null;
	actorIp: string | null;
	actorUa: string | null;
	actorSite: string | null;
	targetType: string | null;
	targetId: string | null;
	metadata: Record<string, unknown> | null;
};

export type StatsOverviewDTO = {
	totalUsers: number;
	newUsers30d: number;
	activeSessions: number;
	organizationCount: number;
	bannedCount: number;
	usersWithout2FA: number;
	loginChannels: Record<string, number>;
};

export type SignupPointDTO = {
	date: string;
	count: number;
};

export type SecurityTodayDTO = {
	failedLoginsToday: number;
	otpRequestsToday: number;
	geoAnomalyCount: number;
};

export type Page<T> = {
	rows: T[];
	total: number;
};

export type OrgDTO = {
	id: string;
	name: string;
	slug: string;
	createdAt: string;
	membersCount?: number;
};

export type ApiKeyDTO = {
	id: string;
	name: string;
	enabled: boolean;
	startsAt: string | null;
	expiresAt: string | null;
	prefix: string;
	lastUsedAt: string | null;
	remaining: number | null;
};
