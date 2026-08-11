import { createAuthEndpoint } from "@cinaauth/core/api";
import type { CleanedWhere } from "@cinaauth/core/db/adapter";
import { APIError, BASE_ERROR_CODES } from "@cinaauth/core/error";
import * as z from "zod";
import { ADMIN_ERROR_CODES } from "./error-codes";
import { hasPermission } from "./has-permission";
import { adminMiddleware } from "./routes";
import type { AdminOptions } from "./types";

type AdminPasskeyRecord = {
	id: string;
	userId: string;
	name?: string | null;
	deviceType?: string | null;
	backedUp?: boolean | null;
	createdAt?: Date | string | null;
	aaguid?: string | null;
};

type AdminPasskeyMetadata = Omit<AdminPasskeyRecord, "userId">;

const eq = (field: string, value: string): CleanedWhere => ({
	field,
	operator: "eq",
	value,
	connector: "AND",
	mode: "sensitive",
});

const targetUserBodySchema = z.object({
	userId: z.string().trim().min(1),
});

const targetPasskeyBodySchema = targetUserBodySchema.extend({
	passkeyId: z.string().trim().min(1),
});

const updateTargetPasskeyBodySchema = targetPasskeyBodySchema.extend({
	name: z.string().trim().min(1).max(128),
});

const toMetadata = (passkey: AdminPasskeyRecord): AdminPasskeyMetadata => ({
	id: passkey.id,
	name: passkey.name ?? "",
	deviceType: passkey.deviceType ?? null,
	backedUp: passkey.backedUp ?? null,
	createdAt: passkey.createdAt ?? null,
	aaguid: passkey.aaguid ?? null,
});

const requireTargetUser = async (
	userId: string,
	findUserById: (id: string) => Promise<unknown>,
) => {
	const user = await findUserById(userId);
	if (!user) {
		throw APIError.from("NOT_FOUND", BASE_ERROR_CODES.USER_NOT_FOUND);
	}
};

/** List the non-secret passkey metadata for an explicit target user. */
export const adminListUserPasskeys = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/list-user-passkeys",
		{
			method: "POST",
			use: [adminMiddleware],
			body: targetUserBodySchema,
			metadata: {
				openapi: {
					operationId: "adminListUserPasskeys",
					summary: "List a target user's passkeys",
				},
			},
		},
		async (ctx) => {
			const allowed = hasPermission({
				userId: ctx.context.session.user.id,
				role: ctx.context.session.user.role,
				options: opts,
				permissions: { passkey: ["list"] },
			});
			if (!allowed) {
				throw APIError.from(
					"FORBIDDEN",
					ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USER_PASSKEYS,
				);
			}

			await requireTargetUser(ctx.body.userId, (id) =>
				ctx.context.internalAdapter.findUserById(id),
			);
			const passkeys = await ctx.context.adapter.findMany<AdminPasskeyRecord>({
				model: "passkey",
				limit: 1000,
				where: [eq("userId", ctx.body.userId)],
			});
			return ctx.json({ passkeys: passkeys.map(toMetadata) });
		},
	);

/** Revoke one passkey only when it belongs to the explicit target user. */
export const adminDeleteUserPasskey = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/delete-user-passkey",
		{
			method: "POST",
			use: [adminMiddleware],
			body: targetPasskeyBodySchema,
			metadata: {
				openapi: {
					operationId: "adminDeleteUserPasskey",
					summary: "Revoke a target user's passkey",
				},
			},
		},
		async (ctx) => {
			const allowed = hasPermission({
				userId: ctx.context.session.user.id,
				role: ctx.context.session.user.role,
				options: opts,
				permissions: { passkey: ["revoke"] },
			});
			if (!allowed) {
				throw APIError.from(
					"FORBIDDEN",
					ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_REVOKE_USER_PASSKEYS,
				);
			}

			await requireTargetUser(ctx.body.userId, (id) =>
				ctx.context.internalAdapter.findUserById(id),
			);
			const where = [
				eq("id", ctx.body.passkeyId),
				eq("userId", ctx.body.userId),
			];
			const passkey = await ctx.context.adapter.findOne<AdminPasskeyRecord>({
				model: "passkey",
				where,
			});
			if (!passkey) {
				throw APIError.from(
					"NOT_FOUND",
					ADMIN_ERROR_CODES.TARGET_USER_PASSKEY_NOT_FOUND,
				);
			}

			await ctx.context.adapter.delete({ model: "passkey", where });
			return ctx.json({ success: true });
		},
	);

/** Rename one passkey only when it belongs to the explicit target user. */
export const adminUpdateUserPasskey = (opts: AdminOptions) =>
	createAuthEndpoint(
		"/admin/update-user-passkey",
		{
			method: "POST",
			use: [adminMiddleware],
			body: updateTargetPasskeyBodySchema,
			metadata: {
				openapi: {
					operationId: "adminUpdateUserPasskey",
					summary: "Rename a target user's passkey",
				},
			},
		},
		async (ctx) => {
			const allowed = hasPermission({
				userId: ctx.context.session.user.id,
				role: ctx.context.session.user.role,
				options: opts,
				permissions: { passkey: ["update"] },
			});
			if (!allowed) {
				throw APIError.from(
					"FORBIDDEN",
					ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_UPDATE_USER_PASSKEYS,
				);
			}

			await requireTargetUser(ctx.body.userId, (id) =>
				ctx.context.internalAdapter.findUserById(id),
			);
			const where = [
				eq("id", ctx.body.passkeyId),
				eq("userId", ctx.body.userId),
			];
			const passkey = await ctx.context.adapter.findOne<AdminPasskeyRecord>({
				model: "passkey",
				where,
			});
			if (!passkey) {
				throw APIError.from(
					"NOT_FOUND",
					ADMIN_ERROR_CODES.TARGET_USER_PASSKEY_NOT_FOUND,
				);
			}

			const updated = await ctx.context.adapter.update<AdminPasskeyRecord>({
				model: "passkey",
				where,
				update: { name: ctx.body.name },
			});
			if (!updated) {
				throw APIError.from(
					"NOT_FOUND",
					ADMIN_ERROR_CODES.TARGET_USER_PASSKEY_NOT_FOUND,
				);
			}
			return ctx.json({ passkey: toMetadata(updated) });
		},
	);
