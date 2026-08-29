type AgentFlowError = {
	code: string | null;
	message: string;
};

export const getAgentFlowError = (
	value: unknown,
	fallback: string,
): AgentFlowError => {
	if (typeof value !== "object" || value === null) {
		return { code: null, message: fallback };
	}
	const error = value as Record<string, unknown>;
	const code =
		typeof error.error === "string"
			? error.error
			: typeof error.code === "string"
				? error.code
				: null;
	for (const field of ["message", "error_description", "error"] as const) {
		if (typeof error[field] === "string" && error[field]) {
			return { code, message: error[field] };
		}
	}
	return { code, message: fallback };
};

/** Builds a same-origin fresh sign-in return without accepting open redirects. */
export const buildAgentApprovalStepUpPath = (currentPath: string) => {
	const callbackURL = currentPath.startsWith("/device/capabilities")
		? currentPath
		: "/device/capabilities";
	const params = new URLSearchParams({
		mode: "step-up",
		callbackURL,
	});
	return `/sign-in?${params.toString()}`;
};
