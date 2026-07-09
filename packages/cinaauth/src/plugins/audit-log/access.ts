import { createAccessControl } from "../access";

export const auditStatements = {
	audit: ["read", "write"],
} as const;

export const auditAc = createAccessControl(auditStatements);
