export const getAdminLoginErrorKey = (code: string | null) => {
	if (code === "admin_forbidden") return "login.adminForbidden";
	if (code) return "login.oidcUnavailable";
	return null;
};
