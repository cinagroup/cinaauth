"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuthCapabilities } from "@/lib/auth-capabilities";

/** Deduplicated, fail-closed view of the Auth Worker's live capabilities. */
export const useAuthCapabilities = () =>
	useQuery({
		queryKey: ["auth-capabilities"],
		queryFn: () => fetchAuthCapabilities(),
		staleTime: 60_000,
	});
