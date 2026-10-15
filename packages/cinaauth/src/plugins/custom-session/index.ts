import type {
	CinaAuthOptions,
	CinaAuthPlugin,
	GenericEndpointContext,
} from "@cinaauth/core";
import { createAuthEndpoint, createAuthMiddleware } from "@cinaauth/core/api";
import type { Session, User } from "@cinaauth/core/db";
import { getSession } from "../../api";
import {
	parseSetCookieHeader,
	toCookieOptions,
} from "../../cookies/cookie-utils";
import { getSessionQuerySchema } from "../../cookies/session-store";
import { getEndpointResponse } from "../../utils/plugin-helper";
import { PACKAGE_VERSION } from "../../version";
import { getSetCookieHeaders } from "./cookie-headers";

declare module "@cinaauth/core" {
	interface CinaAuthPluginRegistry<AuthOptions, Options> {
		"custom-session": {
			creator: typeof customSession;
		};
	}
}

export type CustomSessionPluginOptions = {
	/**
	 * This option is used to determine if the list-device-sessions endpoint should be mutated to the custom session data.
	 * @default false
	 */
	shouldMutateListDeviceSessionsEndpoint?: boolean | undefined;
};

export const customSession = <
	Returns extends Record<string, any>,
	O extends CinaAuthOptions = CinaAuthOptions,
>(
	fn: (
		session: {
			user: User<O["user"], O["plugins"]>;
			session: Session<O["session"], O["plugins"]>;
		},
		ctx: GenericEndpointContext,
	) => Promise<Returns>,
	options?: O | undefined,
	pluginOptions?: CustomSessionPluginOptions | undefined,
) => {
	return {
		id: "custom-session",
		version: PACKAGE_VERSION,
		hooks: {
			after: [
				{
					matcher: (ctx) =>
						ctx.path === "/multi-session/list-device-sessions" &&
						(pluginOptions?.shouldMutateListDeviceSessionsEndpoint ?? false),
					handler: createAuthMiddleware(async (ctx) => {
						const response = await getEndpointResponse<[]>(ctx);
						if (!response) return;
						const newResponse = await Promise.all(
							response.map(async (v) => await fn(v, ctx)),
						);
						return ctx.json(newResponse);
					}),
				},
			],
		},
		endpoints: {
			getSession: createAuthEndpoint(
				"/get-session",
				{
					method: "GET",
					query: getSessionQuerySchema,
					metadata: {
						CUSTOM_SESSION: true,
						openapi: {
							description: "Get custom session data",
							responses: {
								"200": {
									description: "Success",
									content: {
										"application/json": {
											schema: {
												type: "array",
												nullable: true,
												items: {
													$ref: "#/components/schemas/Session",
												},
											},
										},
									},
								},
							},
						},
					},
					requireHeaders: true,
				},
				async (ctx): Promise<Returns | null> => {
					const { headers, response } = await getSession<O>()({
						...ctx,
						method: "GET",
						asResponse: false,
						headers: ctx.headers,
						returnHeaders: true,
					});

					const sessionPayload = response ? await fn(response, ctx) : null;

					for (const cookie of getSetCookieHeaders(headers)) {
						for (const [name, attributes] of parseSetCookieHeader(cookie)) {
							ctx.setCookie(
								name,
								attributes.value,
								toCookieOptions(attributes),
							);
						}
					}
					headers.delete("set-cookie");
					headers.forEach((value, name) => ctx.setHeader(name, value));

					return ctx.json(sessionPayload);
				},
			),
		},
		$Infer: {
			Session: {} as Awaited<ReturnType<typeof fn>>,
		},
		options: pluginOptions,
	} satisfies CinaAuthPlugin;
};
