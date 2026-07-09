import type { CinaAuthPluginDBSchema } from "@cinaauth/core/db";

export const schema = {
	user: {
		fields: {
			role: {
				type: "string",
				required: false,
				input: false,
			},
			banned: {
				type: "boolean",
				defaultValue: false,
				required: false,
				input: false,
			},
			banReason: {
				type: "string",
				required: false,
				input: false,
			},
			banExpires: {
				type: "date",
				required: false,
				input: false,
			},
		},
	},
	session: {
		fields: {
			impersonatedBy: {
				type: "string",
				required: false,
				input: false,
			},
		},
	},
} satisfies CinaAuthPluginDBSchema;

export type AdminSchema = typeof schema;
