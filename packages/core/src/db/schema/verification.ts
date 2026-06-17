import * as z from "zod";
import type { CinaAuthOptions, Prettify } from "../../types";
import type {
	InferDBFieldsFromOptions,
	InferDBFieldsFromPlugins,
} from "../type";
import { coreSchema } from "./shared";

export const verificationSchema = coreSchema.extend({
	value: z.string(),
	expiresAt: z.date(),
	identifier: z.string(),
});

export type BaseVerification = z.infer<typeof verificationSchema>;

/**
 * Verification schema type used by cinaauth, note that it's possible that verification could have additional fields
 */
export type Verification<
	DBOptions extends
		CinaAuthOptions["verification"] = CinaAuthOptions["verification"],
	Plugins extends CinaAuthOptions["plugins"] = CinaAuthOptions["plugins"],
> = Prettify<
	BaseVerification &
		InferDBFieldsFromOptions<DBOptions> &
		InferDBFieldsFromPlugins<"verification", Plugins>
>;
