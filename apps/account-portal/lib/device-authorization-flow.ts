type DeviceFlowPath = "/device/approve" | "/device/denied" | "/device/success";

type DeviceFlowSearchParams = Pick<URLSearchParams, "toString">;

type DeviceFlowResponse = {
	error?: unknown;
};

const getErrorMessage = (error: unknown) => {
	if (typeof error !== "object" || error === null) {
		return null;
	}
	const errorRecord = error as Record<string, unknown>;
	for (const field of ["message", "error_description", "error"] as const) {
		if (typeof errorRecord[field] === "string" && errorRecord[field]) {
			return errorRecord[field];
		}
	}
	return null;
};

/** Returns a BetterFetch error message, or null for a successful response. */
export const getDeviceFlowResponseError = (
	response: DeviceFlowResponse,
	fallback: string,
) => (response.error ? getErrorMessage(response.error) || fallback : null);

/** Normalizes thrown transport failures without weakening the response contract. */
export const getDeviceFlowThrownError = (error: unknown, fallback: string) =>
	getErrorMessage(error) || fallback;

/** Preserves callback and device parameters while moving within Device Flow. */
export const buildDeviceFlowPath = (
	pathname: DeviceFlowPath,
	params: DeviceFlowSearchParams,
	userCode?: string,
) => {
	const nextParams = new URLSearchParams(params.toString());
	if (userCode) {
		nextParams.set("user_code", userCode);
	}
	const query = nextParams.toString();
	return query ? `${pathname}?${query}` : pathname;
};
