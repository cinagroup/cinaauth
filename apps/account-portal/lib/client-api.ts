import { sanitizeAccountCallbackURL } from "./sign-in-experience";

type AccountClientResult<T> = {
	data: T | null;
	error: unknown | null;
};

type AccountPasskeyClient = {
	passkey: {
		deletePasskey: (input: {
			id: string;
		}) => Promise<AccountClientResult<unknown>>;
	};
	signOut: () => Promise<unknown>;
};

export type AccountStepUpNavigation = {
	pathname: string;
	search: string;
	assign: (url: string) => void;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object"
		? (value as Record<string, unknown>)
		: null;

const getNestedError = (value: unknown) => {
	const record = asRecord(value);
	return record ? asRecord(record.error) : null;
};

const getErrorCode = (value: unknown) => {
	const record = asRecord(value);
	const nested = getNestedError(value);
	const code = record?.code ?? nested?.code;
	return typeof code === "string" ? code : undefined;
};

const getErrorStatus = (value: unknown) => {
	const record = asRecord(value);
	const nested = getNestedError(value);
	const status = record?.status ?? nested?.status;
	return typeof status === "number" ? status : undefined;
};

const getErrorMessage = (value: unknown, fallback: string) => {
	if (value instanceof Error && value.message) return value.message;
	const record = asRecord(value);
	const nested = getNestedError(value);
	const message = record?.message ?? nested?.message;
	return typeof message === "string" && message ? message : fallback;
};

const getResultError = (value: unknown) => {
	const result = asRecord(value);
	return result && "error" in result ? result.error : null;
};

const toError = (value: unknown, fallback: string) =>
	value instanceof Error
		? value
		: new Error(getErrorMessage(value, fallback), { cause: value });

/** Identifies the authoritative stale-session response used for step-up. */
export const isSessionNotFreshError = (value: unknown) =>
	getErrorStatus(value) === 403 && getErrorCode(value) === "SESSION_NOT_FRESH";

/** Keeps automatic and federated sign-in out of explicit identity step-up. */
export const getAccountSignInPolicy = (mode: string | null) => {
	const requiresUserPresence = mode === "step-up";
	return {
		allowFederatedProviders: !requiresUserPresence,
		requiresUserPresence,
	};
};

/** Returns user-facing context only for the explicit account step-up mode. */
export const getAccountStepUpNotice = (mode: string | null) =>
	getAccountSignInPolicy(mode).requiresUserPresence
		? "Confirm your identity to continue this sensitive security change."
		: null;

const getBrowserNavigation = (): AccountStepUpNavigation | null => {
	if (typeof window === "undefined") return null;
	return {
		pathname: window.location.pathname,
		search: window.location.search,
		assign: (url) => window.location.assign(url),
	};
};

/** Ends the stale session before entering the existing account sign-in flow. */
export const startAccountStepUp = async (
	client: Pick<AccountPasskeyClient, "signOut">,
	navigation?: AccountStepUpNavigation,
) => {
	const target = navigation ?? getBrowserNavigation();
	if (!target) {
		throw new Error("A browser session is required to start reauthentication");
	}

	const signOutResult = await client.signOut();
	const signOutError = getResultError(signOutResult);
	if (signOutError !== null && signOutError !== undefined) {
		throw toError(signOutError, "Unable to end the stale session");
	}

	const callbackURL = sanitizeAccountCallbackURL(
		`${target.pathname}${target.search}`,
	);
	const params = new URLSearchParams({
		mode: "step-up",
		callbackURL,
	});
	target.assign(`/sign-in?${params.toString()}`);
};

/** Deletes a passkey and centrally handles the authoritative step-up response. */
export const deleteAccountPasskey = async (
	client: AccountPasskeyClient,
	passkeyId: string,
	navigation?: AccountStepUpNavigation,
) => {
	const result = await client.passkey.deletePasskey({ id: passkeyId });
	if (result.error === null || result.error === undefined) return result.data;

	if (isSessionNotFreshError(result.error)) {
		await startAccountStepUp(client, navigation);
	}
	throw toError(result.error, "Unable to remove the passkey");
};
