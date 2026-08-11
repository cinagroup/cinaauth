const { existsSync, statSync } = require("node:fs");
const { resolve } = require("node:path");

const STORAGE_STATE_ENV = "CINASEEK_ADMIN_E2E_STORAGE_STATE";

function resolveStorageStatePath(environment = process.env) {
	const configuredPath = environment[STORAGE_STATE_ENV]?.trim();
	if (!configuredPath) {
		throw new Error(
			`${STORAGE_STATE_ENV} is required. Capture a short-lived OIDC-authenticated Playwright storageState file first; see e2e/README.md.`,
		);
	}

	const storageState = resolve(configuredPath);
	if (!existsSync(storageState) || !statSync(storageState).isFile()) {
		throw new Error(
			`${STORAGE_STATE_ENV} must point to an existing storageState file.`,
		);
	}

	return storageState;
}

function createAuthenticatedContext(browser, options = {}) {
	const storageState = resolveStorageStatePath();
	return browser.newContext({ ...options, storageState });
}

function assertAuthenticatedAdminPage(page, baseUrl) {
	const expectedOrigin = new URL(baseUrl).origin;
	const currentUrl = new URL(page.url());
	const isAdminPage =
		currentUrl.origin === expectedOrigin &&
		!currentUrl.pathname.startsWith("/login") &&
		!currentUrl.pathname.startsWith("/api/auth/oidc/");

	if (!isAdminPage) {
		throw new Error(
			"OIDC storageState is missing, expired, or not authorized for CinaSeek Admin. Capture a fresh short-lived state file.",
		);
	}

	return true;
}

module.exports = {
	STORAGE_STATE_ENV,
	assertAuthenticatedAdminPage,
	createAuthenticatedContext,
	resolveStorageStatePath,
};
