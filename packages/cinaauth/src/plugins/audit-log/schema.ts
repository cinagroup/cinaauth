import type { CinaAuthPluginDBSchema } from "@cinaauth/core/db";

export const schema = {
	auditLog: {
		fields: {
			timestamp: {
				type: "date",
				required: true,
				index: true,
			},
			actorId: {
				type: "string",
				required: false,
				index: true,
			},
			actorRole: {
				type: "string",
				required: false,
			},
			actorIp: {
				type: "string",
				required: false,
			},
			actorUa: {
				type: "string",
				required: false,
			},
			actorSite: {
				type: "string",
				required: false,
			},
			category: {
				type: "string",
				required: true,
				index: true,
			},
			action: {
				type: "string",
				required: true,
				index: true,
			},
			targetType: {
				type: "string",
				required: false,
			},
			targetId: {
				type: "string",
				required: false,
				index: true,
			},
			result: {
				type: "string",
				required: true,
			},
			metadata: {
				type: "string",
				required: false,
			},
		},
	},
} satisfies CinaAuthPluginDBSchema;

export type AuditLogSchema = typeof schema;
