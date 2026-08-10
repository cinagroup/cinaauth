import type { UserDTO } from "./dto";

/** Normalize a raw cinaauth user record before it reaches console UI. */
export function mapUserDTO(user: Record<string, unknown>): UserDTO {
	return {
		id: String(user.id ?? ""),
		email: String(user.email ?? ""),
		name: (user.name as string | null | undefined) ?? null,
		role: String(user.role ?? "user"),
		banned: Boolean(user.banned),
		banReason: (user.banReason as string | null | undefined) ?? null,
		banExpires: (user.banExpires as string | number | null | undefined) ?? null,
		twoFactorEnabled: Boolean(user.twoFactorEnabled),
		emailVerified: Boolean(user.emailVerified),
		createdAt: (user.createdAt as string | number | undefined) ?? "",
		image: (user.image as string | null | undefined) ?? null,
	};
}
