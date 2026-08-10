import { describe, expect, it } from "vitest";
import { mapUserDTO } from "@/lib/cinaauth/mappers";

describe("mapUserDTO", () => {
	it("normalizes a complete cinaauth user record", () => {
		expect(
			mapUserDTO({
				id: "u1",
				email: "ava@cinagroup.com",
				name: "Ava Chen",
				role: "security_admin",
				banned: true,
				banReason: "review",
				banExpires: 1_800_000_000_000,
				twoFactorEnabled: true,
				emailVerified: true,
				createdAt: "2026-08-09T00:00:00.000Z",
				image: "https://example.com/avatar.png",
			}),
		).toEqual({
			id: "u1",
			email: "ava@cinagroup.com",
			name: "Ava Chen",
			role: "security_admin",
			banned: true,
			banReason: "review",
			banExpires: 1_800_000_000_000,
			twoFactorEnabled: true,
			emailVerified: true,
			createdAt: "2026-08-09T00:00:00.000Z",
			image: "https://example.com/avatar.png",
		});
	});

	it("supplies stable defaults for optional fields", () => {
		expect(mapUserDTO({ id: "u2", email: "user@example.com" })).toEqual({
			id: "u2",
			email: "user@example.com",
			name: null,
			role: "user",
			banned: false,
			banReason: null,
			banExpires: null,
			twoFactorEnabled: false,
			emailVerified: false,
			createdAt: "",
			image: null,
		});
	});
});
