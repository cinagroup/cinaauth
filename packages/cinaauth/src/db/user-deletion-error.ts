const USER_DELETION_SESSION_CASCADE_ERROR =
	"CINAAUTH_USER_DELETION_SESSION_CASCADE_FAILED";

export const createUserDeletionSessionCascadeError = (cause: unknown) =>
	Object.assign(new Error("Failed to delete user sessions"), {
		code: USER_DELETION_SESSION_CASCADE_ERROR,
		cause,
	});

export const isUserDeletionSessionCascadeError = (
	error: unknown,
): error is Error & { code: typeof USER_DELETION_SESSION_CASCADE_ERROR } =>
	error !== null &&
	typeof error === "object" &&
	"code" in error &&
	error.code === USER_DELETION_SESSION_CASCADE_ERROR;
