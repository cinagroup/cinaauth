import type { StandardResponse } from "@/lib/cinaauth/types";

type AdminUpstreamStatusOptions = {
	allowNotFound?: boolean;
};

/**
 * Preserve only authentication-boundary statuses that the browser must act on.
 * Other upstream failures stay hidden behind the Admin BFF's 502 boundary.
 */
export function adminUpstreamResponseStatus<T>(
	response: StandardResponse<T>,
	options: AdminUpstreamStatusOptions = {},
): number {
	if (response.ok) return 200;
	const status = response.error?.status;
	if (status === 401 || status === 403) return status;
	if (status === 404 && options.allowNotFound === true) return status;
	return 502;
}
