import { cinaauthFetch } from "./client";
import type {
	AuditLogDTO,
	Page,
	SecurityTodayDTO,
	SessionDTO,
	SignupPointDTO,
	StatsOverviewDTO,
	UserDTO,
	WalletDTO,
} from "./dto";
import { mapUserDTO } from "./mappers";

function mapSession(s: Record<string, unknown>): SessionDTO {
	return {
		id: String(s.id ?? ""),
		userId: String(s.userId ?? ""),
		createdAt: String(s.createdAt ?? ""),
		expiresAt: String(s.expiresAt ?? ""),
		ipAddress: (s.ipAddress as string | null | undefined) ?? null,
		userAgent: (s.userAgent as string | null | undefined) ?? null,
	};
}

function mapWallet(w: Record<string, unknown>): WalletDTO {
	return {
		address: String(w.address ?? ""),
		chainId: Number(w.chainId ?? 0),
		isPrimary: Boolean(w.isPrimary),
		boundAt: String(w.boundAt ?? w.createdAt ?? new Date().toISOString()),
		boundIp: (w.boundIp as string | null | undefined) ?? null,
		boundSite: (w.boundSite as string | null | undefined) ?? null,
	};
}

function mapAudit(r: Record<string, unknown>): AuditLogDTO {
	const rawMeta = r.metadata;
	let metadata: Record<string, unknown> | null = null;
	if (typeof rawMeta === "string" && rawMeta.length > 0) {
		try {
			metadata = JSON.parse(rawMeta) as Record<string, unknown>;
		} catch {
			metadata = null;
		}
	} else if (rawMeta && typeof rawMeta === "object") {
		metadata = rawMeta as Record<string, unknown>;
	}
	return {
		id: String(r.id ?? ""),
		timestamp: String(r.timestamp ?? ""),
		category: String(r.category ?? ""),
		action: String(r.action ?? ""),
		result: r.result === "failure" ? "failure" : "success",
		actorId: (r.actorId as string | null | undefined) ?? null,
		actorRole: (r.actorRole as string | null | undefined) ?? null,
		actorIp: (r.actorIp as string | null | undefined) ?? null,
		actorUa: (r.actorUa as string | null | undefined) ?? null,
		actorSite: (r.actorSite as string | null | undefined) ?? null,
		targetType: (r.targetType as string | null | undefined) ?? null,
		targetId: (r.targetId as string | null | undefined) ?? null,
		metadata,
	};
}

/** Build a query string from a record, dropping undefined/empty values. */
function qs(params: Record<string, unknown>): string {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
	}
	const s = sp.toString();
	return s ? `?${s}` : "";
}

/** ---------- Users ---------- */

export async function listUsers(
	cookie: string,
	params: {
		searchField?: "email" | "name" | "wallet";
		searchValue?: string;
		limit?: number;
		offset?: number;
	},
): Promise<Page<UserDTO>> {
	const res = await cinaauthFetch<{
		users: Record<string, unknown>[];
		total: number;
	}>(`/admin/list-users${qs(params)}`, { cookie });
	if (!res.ok || !res.data) {
		throw new Error(res.error?.message ?? "listUsers failed");
	}
	return { rows: res.data.users.map(mapUserDTO), total: res.data.total };
}

export async function getUser(cookie: string, id: string): Promise<UserDTO> {
	const res = await cinaauthFetch<{ user: Record<string, unknown> }>(
		`/admin/get-user?id=${encodeURIComponent(id)}`,
		{ cookie },
	);
	if (!res.ok || !res.data) {
		throw new Error(res.error?.message ?? "getUser failed");
	}
	return mapUserDTO(res.data.user);
}

/** ---------- Wallets ---------- */

export async function listUserWallets(
	cookie: string,
	userId: string,
): Promise<WalletDTO[]> {
	const res = await cinaauthFetch<{ wallets: Record<string, unknown>[] }>(
		`/admin/list-user-wallets?userId=${encodeURIComponent(userId)}`,
		{ cookie },
	);
	if (!res.ok || !res.data) return [];
	return res.data.wallets.map(mapWallet);
}

/** ---------- Sessions ---------- */

export async function listUserSessions(
	cookie: string,
	userId: string,
): Promise<SessionDTO[]> {
	const res = await cinaauthFetch<{ sessions: Record<string, unknown>[] }>(
		`/admin/list-user-sessions?userId=${encodeURIComponent(userId)}`,
		{ cookie },
	);
	if (!res.ok || !res.data) return [];
	return res.data.sessions.map(mapSession);
}

/** ---------- Audit ---------- */

export async function listAudit(
	cookie: string,
	params: {
		limit?: number;
		offset?: number;
		category?: string;
		action?: string;
		actorId?: string;
		actorIp?: string;
		result?: "success" | "failure";
		targetId?: string;
		start?: string;
		end?: string;
	},
): Promise<Page<AuditLogDTO>> {
	const res = await cinaauthFetch<{
		rows: Record<string, unknown>[];
		total: number;
	}>(`/audit/list${qs(params)}`, { cookie });
	if (!res.ok || !res.data) return { rows: [], total: 0 };
	return { rows: res.data.rows.map(mapAudit), total: res.data.total };
}

/** ---------- Stats ---------- */

export async function statsOverview(cookie: string): Promise<StatsOverviewDTO> {
	const res = await cinaauthFetch<StatsOverviewDTO>(`/admin/stats/overview`, {
		cookie,
	});
	if (!res.ok || !res.data) {
		throw new Error(res.error?.message ?? "statsOverview failed");
	}
	return res.data;
}

export async function statsSignups(
	cookie: string,
	range: "7d" | "30d",
): Promise<SignupPointDTO[]> {
	const res = await cinaauthFetch<{ data: SignupPointDTO[] }>(
		`/admin/stats/signups?range=${range}`,
		{ cookie },
	);
	if (!res.ok || !res.data) return [];
	return res.data.data;
}

export async function statsSecurityToday(
	cookie: string,
): Promise<SecurityTodayDTO> {
	const res = await cinaauthFetch<SecurityTodayDTO>(
		`/admin/stats/security-today`,
		{ cookie },
	);
	if (!res.ok || !res.data) {
		return {
			failedLoginsToday: 0,
			otpRequestsToday: 0,
			geoAnomalyCount: 0,
		};
	}
	return res.data;
}
