"use client";

import type { AuthCapabilities } from "@cinaauth/auth-web-contract";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
	AUTH_CAPABILITIES_QUERY_KEY,
	fetchAuthCapabilities,
	isAuthCapabilitiesSnapshot,
} from "@/lib/auth-capabilities";

type CapabilityFetcher = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

const toCapabilityRequestError = (error: unknown) =>
	error instanceof Error
		? error
		: new Error("Unable to load authentication capabilities", {
				cause: error,
			});

/** Preserves fail-closed normalization while exposing transport failures. */
export const fetchAuthCapabilitiesForQuery = async (
	fetcher: CapabilityFetcher = fetch,
	signal?: AbortSignal,
) => {
	let requestError: Error | null = null;
	let responseValidation: Promise<boolean> | null = null;
	const capabilities = await fetchAuthCapabilities(async (input, init) => {
		try {
			const response = await fetcher(input, { ...init, signal });
			if (!response.ok) {
				requestError = new Error(
					`Unable to load authentication capabilities (HTTP ${response.status})`,
				);
			} else {
				responseValidation = response
					.clone()
					.json()
					.then(isAuthCapabilitiesSnapshot)
					.catch(() => false);
			}
			return response;
		} catch (error) {
			requestError = toCapabilityRequestError(error);
			throw error;
		}
	});

	if (requestError) throw requestError;
	if (!responseValidation || !(await responseValidation)) {
		throw new Error(
			"Unable to load authentication capabilities: invalid payload",
		);
	}
	return capabilities;
};

const getAuthCapabilitiesQueryOptions = (): UseQueryOptions<
	AuthCapabilities,
	Error,
	AuthCapabilities,
	typeof AUTH_CAPABILITIES_QUERY_KEY
> => ({
	queryKey: AUTH_CAPABILITIES_QUERY_KEY,
	queryFn: ({ signal }) => fetchAuthCapabilitiesForQuery(fetch, signal),
	staleTime: 60_000,
	retry: 1,
});

/** Deduplicated, fail-closed view of the Auth Worker's live capabilities. */
export const useAuthCapabilities = () =>
	useQuery(getAuthCapabilitiesQueryOptions());
