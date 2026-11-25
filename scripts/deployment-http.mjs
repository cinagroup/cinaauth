const DEPLOYMENT_USER_AGENT =
	"CinaAuth-Deployment/1.0 (+https://github.com/cinagroup/cinaauth)";

/** Identify release probes while preserving request authentication and options. */
export const deploymentFetch = (input, init = {}) => {
	const headers = new Headers(
		init.headers ?? (input instanceof Request ? input.headers : undefined),
	);
	headers.set("User-Agent", DEPLOYMENT_USER_AGENT);
	return fetch(input, { ...init, headers });
};
