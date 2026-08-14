const REOWN_PROJECT_ID = /^[a-fA-F0-9]{32}$/;

/** Build the public marker used to stage SIWE without a cross-release window. */
export const buildAccountBuildReadiness = (
	reownProjectId: string | undefined,
	walletUiEnabled: string | undefined,
) => {
	const ready =
		typeof reownProjectId === "string" && REOWN_PROJECT_ID.test(reownProjectId);
	return {
		schemaVersion: 1,
		ready,
		siweProtocol: "cinaauth-siwe-v2",
		walletUi: "reown-appkit-v1",
		walletUiEnabled: walletUiEnabled === "true",
		reownProjectId: ready ? reownProjectId : null,
	} as const;
};

/** Create a non-cacheable response that identifies the deployed wallet bundle. */
export const createAccountBuildReadinessResponse = (
	reownProjectId: string | undefined,
	walletUiEnabled: string | undefined,
) => {
	const readiness = buildAccountBuildReadiness(reownProjectId, walletUiEnabled);
	return Response.json(readiness, {
		status: readiness.ready ? 200 : 503,
		headers: {
			"Cache-Control": "no-store, max-age=0",
			"CDN-Cache-Control": "no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
};
