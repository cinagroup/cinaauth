import type { CinaAuthOptions, GenericEndpointContext } from "@cinaauth/core";
import { getCurrentAdapter } from "@cinaauth/core/context";
import type { DBAdapter } from "@cinaauth/core/db/adapter";
import type { Jwk, JwtOptions } from "./types";

export const getJwksAdapter = (
	baseAdapter: DBAdapter<CinaAuthOptions>,
	options?: JwtOptions,
) => {
	return {
		getAllKeys: async (ctx: GenericEndpointContext) => {
			if (options?.adapter?.getJwks) {
				return await options.adapter.getJwks(ctx);
			}
			const adapter = await getCurrentAdapter(baseAdapter);
			return await adapter.findMany<Jwk>({
				model: "jwks",
			});
		},
		getLatestKey: async (ctx: GenericEndpointContext) => {
			if (options?.adapter?.getJwks) {
				const keys = await options.adapter.getJwks(ctx);
				return keys
					?.slice()
					.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
			}
			const adapter = await getCurrentAdapter(baseAdapter);
			const keys = await adapter.findMany<Jwk>({
				model: "jwks",
			});
			return keys
				.slice()
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
		},
		createJwk: async (ctx: GenericEndpointContext, webKey: Omit<Jwk, "id">) => {
			if (options?.adapter?.createJwk) {
				return await options.adapter.createJwk(webKey, ctx);
			}
			const adapter = await getCurrentAdapter(baseAdapter);
			const jwk = await adapter.create<Omit<Jwk, "id">, Jwk>({
				model: "jwks",
				data: {
					...webKey,
					createdAt: new Date(),
				},
			});

			return jwk;
		},
		expireJwk: async (
			ctx: GenericEndpointContext,
			id: string,
			expiresAt: Date,
		) => {
			if (options?.adapter?.expireJwk) {
				return await options.adapter.expireJwk(id, expiresAt, ctx);
			}
			if (options?.adapter?.getJwks || options?.adapter?.createJwk) {
				return undefined;
			}
			const adapter = await getCurrentAdapter(baseAdapter);
			return await adapter.update<Jwk>({
				model: "jwks",
				where: [{ field: "id", value: id }],
				update: { expiresAt },
			});
		},
	};
};
