import { defineErrorCodes } from "@cinaauth/core/utils/error-codes";

export const AUDIT_LOG_ERROR_CODES = defineErrorCodes({
	AUDIT_LOG_WRITE_FAILED: "Failed to write audit log entry",
	AUDIT_LOG_QUERY_NOT_ALLOWED: "You are not allowed to query audit logs",
	AUDIT_LOG_WRITE_NOT_ALLOWED: "You are not allowed to write audit logs",
});
