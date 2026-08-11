const isProtectedStatus = (status) => status === 401 || status === 403;

/**
 * Verify that Auth readiness stays protected and that an authorized probe is
 * both reachable and operationally ready.
 */
export const checkAuthReadiness = async ({
	origin,
	migrationToken,
	publicFetch,
	fail,
	warn,
}) => {
	const readyUrl = new URL("/api/ready", origin).href;
	const readiness = await publicFetch(readyUrl, { method: "GET" });
	if (!readiness) {
		fail(`Public readiness endpoint ${readyUrl} is unreachable`);
	} else if (!isProtectedStatus(readiness.status)) {
		fail(
			`Public readiness endpoint ${readyUrl} returned HTTP ${readiness.status}; expected 401 or 403 without a migration token`,
		);
	}

	if (!migrationToken) {
		warn(
			"Authorized auth readiness was not checked because CINAAUTH_MIGRATION_TOKEN is not available in this process",
		);
		return;
	}

	const authorizedReadiness = await publicFetch(readyUrl, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${migrationToken}`,
		},
	});
	if (!authorizedReadiness) {
		fail("Authorized auth readiness is unreachable");
		return;
	}
	if (!authorizedReadiness.ok) {
		fail(
			`Authorized auth readiness failed with HTTP ${authorizedReadiness.status}`,
		);
		return;
	}

	const cacheControl = authorizedReadiness.headers.get("cache-control") || "";
	if (!cacheControl.toLowerCase().includes("no-store")) {
		fail("Authorized auth readiness must return Cache-Control: no-store");
	}
	const body = await authorizedReadiness.json().catch(() => undefined);
	if (
		!body ||
		typeof body !== "object" ||
		body.success !== true ||
		body.runtimeConfig?.ok !== true ||
		body.secretsStore?.active !== true ||
		body.secretsStore?.source !== "secrets-store-v2" ||
		body.secretsStore?.ok !== true ||
		!Array.isArray(body.secretsStore?.issues) ||
		body.secretsStore.issues.length !== 0 ||
		body.database?.ok !== true ||
		body.cutover?.state !== "live"
	) {
		fail(
			`Authorized auth readiness failed with HTTP ${authorizedReadiness.status}`,
		);
	}
};
