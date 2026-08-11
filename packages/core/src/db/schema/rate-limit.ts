import * as z from "zod";
import type { CinaAuthOptions, Prettify } from "../../types";
import type {
	InferDBFieldsFromOptions,
	InferDBFieldsFromPlugins,
} from "../type";

export const rateLimitSchema = z.object({
	/**
	 * The key to use for rate limiting
	 */
	key: z.string(),
	/**
	 * The number of requests made
	 */
	count: z.number(),
	/**
	 * The last request time in milliseconds
	 */
	lastRequest: z.number(),
});

export type BaseRateLimit = z.infer<typeof rateLimitSchema>;

/**
 * Rate limit schema type used by cinaauth for rate limiting
 */
export type RateLimit<
	DBOptions extends CinaAuthOptions["rateLimit"] = CinaAuthOptions["rateLimit"],
	Plugins extends CinaAuthOptions["plugins"] = CinaAuthOptions["plugins"],
> = Prettify<
	BaseRateLimit &
		InferDBFieldsFromOptions<DBOptions> &
		InferDBFieldsFromPlugins<"rateLimit", Plugins>
>;
