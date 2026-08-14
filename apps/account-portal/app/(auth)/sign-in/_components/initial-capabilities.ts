import type { AuthCapabilities } from "@cinaauth/auth-web-contract";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import {
	AUTH_CAPABILITIES_QUERY_KEY,
	isAuthCapabilitiesSnapshot,
} from "@/lib/auth-capabilities";

type SignInCapabilityLoader = () => Promise<AuthCapabilities>;

/** Returns only an authoritative server snapshot; failures defer to the client query. */
export const loadInitialSignInCapabilities = async (
	loadCapabilities: SignInCapabilityLoader,
): Promise<AuthCapabilities | undefined> => {
	try {
		const capabilities: unknown = await loadCapabilities();
		return isAuthCapabilitiesSnapshot(capabilities) ? capabilities : undefined;
	} catch {
		return undefined;
	}
};

/** Builds the request-scoped cache state consumed by the app QueryClient. */
export const createSignInCapabilitiesHydrationState = (
	capabilities: AuthCapabilities,
) => {
	const queryClient = new QueryClient();
	queryClient.setQueryData(AUTH_CAPABILITIES_QUERY_KEY, capabilities);
	return dehydrate(queryClient);
};
