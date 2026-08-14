import type { AuthCapabilities } from "@cinaauth/auth-web-contract";

const REOWN_PROJECT_ID = /^[a-fA-F0-9]{32}$/;

/** Accepts only the public project ID format issued by the Reown dashboard. */
export const normalizeReownProjectId = (value: string | undefined) => {
	const projectId = value?.trim();
	return projectId && REOWN_PROJECT_ID.test(projectId) ? projectId : null;
};

/** Enables wallet entry points only for an explicitly approved build. */
export const isSiweWalletUiEnabled = (value: string | undefined) =>
	value === "true";

/** Keeps the optional wallet UI closed until both server and build agree. */
export const isReownWalletReady = (
	capabilities: AuthCapabilities | undefined,
	projectId: string | undefined,
	walletUiEnabled: string | undefined,
) =>
	isSiweWalletUiEnabled(walletUiEnabled) &&
	capabilities?.methods.siwe === true &&
	normalizeReownProjectId(projectId) !== null;
